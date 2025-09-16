// src/pages/Settings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/authStore";
import { useProfile } from "../lib/profileStore";

function Field({ label, error, children, help }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      {children}
      {error ? (
        <div className="text-xs text-rose-600">{error}</div>
      ) : (
        <div className="text-[10px] text-transparent">.</div>
      )}
      {help && <div className="text-xs text-slate-500">{help}</div>}
    </div>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { ready, profile, load, save } = useProfile();

  // Normalize current profile → form (supports old keys too)
  const initial = useMemo(() => {
    const p = profile || {};
    const bg =
      (p.backgroundType || p.role || "student").toLowerCase() === "experienced"
        ? "experienced"
        : "student";
    return {
      fullName: p.fullName || p.name || "",
      email: p.email || user?.email || "",
      dob: p.dob || "",
      gender: p.gender || "",
      country: p.country || "",
      city: p.city || "",
      backgroundType: bg, // "student" | "experienced"
      universityName: p.universityName || p.university || "",
      jobExperience:
        p.jobExperience ||
        (p.jobTitle ? `${p.expYears ?? ""} years as ${p.jobTitle}` : ""),
    };
  }, [profile, user?.email]);

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    if (!ready) load();
  }, [ready, load]);

  // When profile loads later, refresh the form once
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const isStudent = form.backgroundType === "student";

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validate() {
    const e = {};
    const has = (v) => v !== undefined && v !== null && String(v).trim() !== "";
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!has(form.fullName)) e.fullName = "Full name is required.";
    if (!emailRe.test(form.email.trim())) e.email = "Enter a valid email.";
    if (!has(form.dob)) e.dob = "Date of birth is required.";
    if (!has(form.gender)) e.gender = "Please select a value.";
    if (!has(form.country)) e.country = "Country is required.";
    if (!has(form.city)) e.city = "City is required.";
    if (form.backgroundType !== "student" && form.backgroundType !== "experienced") {
      e.backgroundType = "Choose student or experienced.";
    }

    if (isStudent) {
      if (!has(form.universityName)) e.universityName = "University is required.";
    } else {
      if (!has(form.jobExperience)) e.jobExperience = "Job experience is required.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSave(e) {
    e.preventDefault();
    setOkMsg("");
    if (!validate()) return;

    try {
      setBusy(true);
      await save({
        // canonical backend shape
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        dob: form.dob,
        gender: form.gender,
        country: form.country.trim(),
        city: form.city.trim(),
        backgroundType: form.backgroundType, // "student" | "experienced"
        universityName: isStudent ? form.universityName.trim() : undefined,
        jobExperience: !isStudent ? form.jobExperience.trim() : undefined,
      });
      setOkMsg("Profile saved ✓");
      setTimeout(() => setOkMsg(""), 2500);
    } catch (err) {
      alert(err?.message || "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          <div className="text-sm text-slate-600">Loading settings…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
        Settings
      </h1>

      <div className="rounded-3xl bg-white shadow-card border border-slate-200 p-6 md:p-8">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>

        <form className="space-y-6" onSubmit={onSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Full Name" error={errors.fullName}>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder="Your full name"
              />
            </Field>

            <Field label="Email" error={errors.email}>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Date of Birth" error={errors.dob}>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                value={form.dob}
                onChange={(e) => setField("dob", e.target.value)}
              />
            </Field>

            <Field label="Gender" error={errors.gender}>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                value={form.gender}
                onChange={(e) => setField("gender", e.target.value)}
              >
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
            </Field>

            <Field label="Country" error={errors.country}>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
                placeholder="Country"
              />
            </Field>

            <Field label="City" error={errors.city}>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="City"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Background" error={errors.backgroundType}>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="bg"
                    checked={form.backgroundType === "student"}
                    onChange={() => setField("backgroundType", "student")}
                  />
                  Student
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="bg"
                    checked={form.backgroundType === "experienced"}
                    onChange={() => setField("backgroundType", "experienced")}
                  />
                  Experienced
                </label>
              </div>
            </Field>

            {isStudent ? (
              <Field label="University name" error={errors.universityName}>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  value={form.universityName}
                  onChange={(e) => setField("universityName", e.target.value)}
                  placeholder="e.g., UBC"
                />
              </Field>
            ) : (
              <Field label="Job experience" error={errors.jobExperience}>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  value={form.jobExperience}
                  onChange={(e) => setField("jobExperience", e.target.value)}
                  placeholder='e.g., "2 years as Cashier"'
                />
              </Field>
            )}
          </div>

          {okMsg && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {okMsg}
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-slate-900 text-white px-4 py-3 font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-slate-300 px-4 py-3 text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
