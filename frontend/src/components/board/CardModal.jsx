// frontend/src/components/board/CardModal.jsx
import { useEffect, useState } from "react";

export default function CardModal({
  open,
  mode = "edit",
  initial = null,
  stages = [],
  onClose,
  onSave,
  onDelete,
}) {
  const isCreate = mode === "create";

  const [values, setValues] = useState(() => ({
    title: "",
    status: stages[0]?.key || "saved",
    dueDate: "", // UI label: Next follow-up
    company: "",
    location: "",
    link: "",
    tags: [],
    notes: "",
    // NEW fields
    salary: "",
    referredBy: "",
    source: "",
    // contact
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  }));

  const [tagsInput, setTagsInput] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const v = {
      title: initial?.title || "",
      status: initial?.status || stages[0]?.key || "saved",
      dueDate: initial?.dueDate || "",
      company: initial?.company || "",
      location: initial?.location || "",
      link: initial?.link || "",
      tags: Array.isArray(initial?.tags) ? initial.tags : [],
      notes: initial?.notes || "",
      salary:
        initial?.salary === 0 || initial?.salary
          ? String(initial.salary)
          : "",
      referredBy: initial?.referredBy || "",
      source: initial?.source || "",
      contactName: initial?.contactName || "",
      contactEmail: initial?.contactEmail || "",
      contactPhone: initial?.contactPhone || "",
    };
    setValues(v);
    setTagsInput(Array.isArray(v.tags) ? v.tags.join(", ") : "");
  }, [open, initial, stages]);

  function setField(k, v) {
    setValues((s) => ({ ...s, [k]: v }));
  }

  function parseTags(s) {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function save() {
    setBusy(true);
    try {
      await onSave({ ...values, tags: parseTags(tagsInput) });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      {/* This wrapper scrolls if the panel would overflow the viewport */}
      <div className="absolute inset-0 overflow-auto p-3 md:p-6">
        {/* Panel: fixed max-height; inner content scrolls; header/footer stay visible */}
        <div className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <div className="text-xl font-semibold">
                {isCreate ? "New Card" : "Edit Card"}
              </div>
              <div className="text-xs text-slate-500 capitalize">
                {values.status || ""}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              {/* Position name (renamed from Title) */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Position name *</span>
                <input
                  value={values.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g., Software Engineer"
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Stage */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Stage</span>
                <select
                  value={values.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="rounded border px-3 py-2"
                >
                  {stages.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Next follow-up (no quick buttons) */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Next follow-up</span>
                <input
                  type="date"
                  value={values.dueDate || ""}
                  onChange={(e) => setField("dueDate", e.target.value)}
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Salary */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Salary</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g., 90000"
                  value={values.salary}
                  onChange={(e) => setField("salary", e.target.value)}
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Company */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Company</span>
                <input
                  value={values.company}
                  onChange={(e) => setField("company", e.target.value)}
                  placeholder="Company name"
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Referred by */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Referred by</span>
                <input
                  value={values.referredBy}
                  onChange={(e) => setField("referredBy", e.target.value)}
                  placeholder="Person / source of referral"
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Location */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Location</span>
                <input
                  value={values.location}
                  onChange={(e) => setField("location", e.target.value)}
                  placeholder="City, Country"
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Source */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Source</span>
                <input
                  value={values.source}
                  onChange={(e) => setField("source", e.target.value)}
                  placeholder="e.g., LinkedIn, Company site"
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Link */}
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-sm font-medium">Link</span>
                <input
                  value={values.link}
                  onChange={(e) => setField("link", e.target.value)}
                  placeholder="https://careers.example.com/job/123"
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Tags */}
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-sm font-medium">Tags (comma separated)</span>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="remote, intern"
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Notes */}
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-sm font-medium">Notes</span>
                <textarea
                  rows={4}
                  value={values.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Interview plan, follow-ups, questions…"
                  className="rounded border px-3 py-2"
                />
              </label>

              {/* Contact (optional) */}
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => setContactOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm"
                >
                  <span>▸ Contact (optional)</span>
                  <span className="text-slate-400">{contactOpen ? "Hide" : "Show"}</span>
                </button>
                {contactOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input
                      placeholder="Name"
                      value={values.contactName}
                      onChange={(e) => setField("contactName", e.target.value)}
                      className="rounded border px-3 py-2"
                    />
                    <input
                      placeholder="Email"
                      value={values.contactEmail}
                      onChange={(e) => setField("contactEmail", e.target.value)}
                      className="rounded border px-3 py-2"
                    />
                    <input
                      placeholder="Phone"
                      value={values.contactPhone}
                      onChange={(e) => setField("contactPhone", e.target.value)}
                      className="rounded border px-3 py-2"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer (always visible) */}
          <div className="flex items-center justify-between border-t px-5 py-4">
            <button
              onClick={() => {
                if (!confirm("Delete this job card?")) return;
                onDelete?.();
              }}
              className="rounded bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700"
            >
              Delete card
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="rounded border px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={save}
                className="rounded bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {isCreate ? "Create card" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
