import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

export default function Onboarding() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { save: saveProfileStore, profile } = useProfile();

  // normalize URL param → backgroundType we use in the UI
  const urlRole = (params.get("role") || "").toLowerCase(); // "student" | "employed" | "experienced" | ""
  const defaultBg =
    urlRole === "experienced" || urlRole === "employed" ? "experienced" : "student";

  // form state (keep keys simple; we’ll map on submit)
  const [form, setForm] = useState({
    fullName: profile?.fullName || "",
    email: profile?.email || user?.email || "",
    dob: profile?.dob || "",
    gender: profile?.gender || "",
    country: profile?.country || "",
    city: profile?.city || "",
    backgroundType: profile?.backgroundType || defaultBg, // student | experienced
    universityName: profile?.universityName || "",
    jobExperience: profile?.jobExperience || "",
    // compatibility fields if you previously used them
    jobTitle: profile?.jobTitle || "",
    expYears: profile?.expYears?.toString() || "",
  });

  useEffect(() => {
    // if the URL changes between student/experienced, reflect it
    setForm((f) => ({
      ...f,
      backgroundType:
        urlRole === "experienced" || urlRole === "employed" ? "experienced" : "student",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRole]);

  const isStudent = useMemo(() => form.backgroundType === "student", [form.backgroundType]);
  const isExperienced = !isStudent;

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.fullName.trim()) e.fullName = "Name is required.";
    if (!emailRe.test((form.email || "").trim())) e.email = "Enter a valid email.";

    if (!form.dob) e.dob = "Date of birth is required.";
    else {
      const d = new Date(form.dob);
      if (isNaN(+d)) e.dob = "Use YYYY-MM-DD.";
      if (!e.dob && d > new Date()) e.dob = "DOB cannot be in the future.";
    }

    if (!form.gender) e.gender = "Please select a value.";
    if (!form.country.trim()) e.country = "Country is required.";
    if (!form.city.trim()) e.city = "City is required.";

    if (isStudent) {
      if (!form.universityName.trim()) e.universityName = "University name is required.";
    } else {
      if (!form.jobExperience.trim()) {
        // allow fallback composition from jobTitle/expYears if you still use them
        const yrs = form.expYears?.toString().trim();
        const title = form.jobTitle?.trim();
        if (!(yrs && title)) e.jobExperience = "Add your experience.";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    // Build a backward/forward compatible payload
    const normalizedBg = form.backgroundType; // "student" | "experienced"

    // if jobExperience empty but old fields exist, compose a string
    let jobExp = form.jobExperience.trim();
    if (!jobExp && form.expYears && form.jobTitle) {
      jobExp = `${form.expYears} years as ${form.jobTitle}`.trim();
    }

    const payload = {
      // common
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      dob: form.dob,
      gender: form.gender,
      country: form.country.trim(),
      city: form.city.trim(),

      // NEW shape
      backgroundType: normalizedBg, // our UI field
      universityName: isStudent ? form.universityName.trim() : undefined,
      jobExperience: isExperienced ? jobExp : undefined,

      // OLD/compat fields so older backend versions also pass:
      role: normalizedBg === "student" ? "student" : "experienced",
      university: isStudent ? form.universityName.trim() : undefined,
      jobTitle: isExperienced ? form.jobTitle.trim() : undefined,
      expYears: isExperienced && form.expYears ? Number(form.expYears) : undefined,
    };

    try {
      setBusy(true);
      await saveProfileStore(payload);
      nav("/board");
    } catch (err) {
      alert(err?.message || "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 text-slate-900 font-semibold">JobCopilot</div>

        <div className="rounded-3xl bg-white shadow-card border border-slate-200 p-6 md:p-8">
          <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 mb-2">
            Tell us about you
          </h1>
          <p className="text-slate-600 mb-6">
            We’ll personalize your experience. All fields have simple validation.
          </p>

          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Full Name" error={errors.fullName}>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  placeholder="e.g., John Doe"
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
                  placeholder="e.g., Canada"
                />
              </Field>

              <Field label="City" error={errors.city}>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="e.g., Vancouver"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Background">
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
                <Field
                  label="Job experience"
                  help="Short sentence, e.g., “2 years as Cashier”"
                  error={errors.jobExperience}
                >
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                    value={form.jobExperience}
                    onChange={(e) => setField("jobExperience", e.target.value)}
                    placeholder="e.g., 2 years as Cashier"
                  />
                </Field>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-pink-500 text-white py-3 font-semibold hover:bg-pink-600 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save and continue to your board"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
