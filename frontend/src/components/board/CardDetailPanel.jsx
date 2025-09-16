// src/components/board/CardDetailPanel.jsx
import { useEffect, useRef, useState } from "react";

/**
 * Props:
 *  - open
 *  - mode: "edit" | "create"
 *  - initial: card-like object (status is human label here)
 *  - statusOptions: [{value:key,label:name}]
 *  - onClose()
 *  - onSave(values) // values.status is label; convert in parent
 */
export default function CardDetailPanel({
  open,
  mode = "edit",
  initial = {},
  statusOptions = [],
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    link: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    dueDate: "",
    status: statusOptions[0]?.label || "SAVED",
    notes: "",
    tags: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm((f) => ({
      ...f,
      ...pickKnown(initial),
      status: initial.status || (statusOptions[0]?.label || f.status),
      tags: Array.isArray(initial.tags) ? initial.tags.join(", ") : (initial.tags || ""),
    }));
    // eslint-disable-next-line
  }, [open]);

  const panelRef = useRef(null);

  function pickKnown(obj = {}) {
    const keys = [
      "title","company","location","link",
      "contactName","contactEmail","contactPhone",
      "dueDate","status","notes","tags",
    ];
    const out = {};
    keys.forEach((k) => { if (obj[k] != null) out[k] = obj[k]; });
    return out;
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function addDays(n) {
    const d = new Date(); d.setDate(d.getDate() + n);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setForm((s) => ({ ...s, dueDate: `${yyyy}-${mm}-${dd}` }));
  }

  function handleSave(e) {
    e?.preventDefault?.();
    const values = {
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };
    onSave?.(values);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full max-w-lg transform bg-white shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-sm font-semibold text-slate-800">
            {mode === "create" ? "Create Job Card" : "Card Details"}
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="grid gap-4 overflow-auto p-5">
          <div>
            <label className="block text-xs font-medium text-slate-600">Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              required
              placeholder="e.g., Data Analyst"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Company</label>
              <input
                name="company"
                value={form.company}
                onChange={onChange}
                placeholder="RBC"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Location</label>
              <input
                name="location"
                value={form.location}
                onChange={onChange}
                placeholder="Toronto, ON"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Link</label>
            <input
              name="link"
              value={form.link}
              onChange={onChange}
              placeholder="https://careers.example.com/job/123"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Contact name</label>
              <input
                name="contactName"
                value={form.contactName}
                onChange={onChange}
                placeholder="Recruiter name"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Contact email</label>
              <input
                name="contactEmail"
                value={form.contactEmail}
                onChange={onChange}
                placeholder="name@company.com"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Contact phone</label>
              <input
                name="contactPhone"
                value={form.contactPhone}
                onChange={onChange}
                placeholder="+1 555 123 4567"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Due date / Reminder</label>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={onChange}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => addDays(2)} className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50">
                  +2 days
                </button>
                <button type="button" onClick={() => addDays(7)} className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50">
                  +7 days
                </button>
                <button type="button" onClick={() => addDays(14)} className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50">
                  +14 days
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={onChange}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.label}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Tags (comma separated)</label>
            <input
              name="tags"
              value={form.tags}
              onChange={onChange}
              placeholder="remote, intern, analytics"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={onChange}
              rows={5}
              placeholder="Interview plan, follow-ups, questions…"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {mode === "create" ? "Create" : "Save changes"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
