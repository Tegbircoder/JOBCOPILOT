// src/components/filters/SmartFilter.jsx
// Props:
//   search: string
//   value: { key: 'status'|'company'|'title'|'location'|'tag', value: string } | null
//   onChange: (newValueOrNull) => void
//
// Behavior: Button "Filter" -> Step 1 choose Field -> Step 2 choose a Value with counts (from /stats?q=...)

import { useEffect, useState } from "react";
import { loadStats } from "../../lib/statsAdapter";

const FIELDS = [
  { key: "status",   label: "Stage" },
  { key: "company",  label: "Company" },
  { key: "title",    label: "Title" },
  { key: "location", label: "Location" },
  { key: "tag",      label: "Tag" },
];

function Dropdown({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="relative">
      <div className="absolute z-20 mt-2 w-72 rounded-xl border bg-white p-3 shadow-xl">
        {children}
      </div>
      <div className="fixed inset-0 z-10" onClick={onClose} />
    </div>
  );
}

export default function SmartFilter({ search = "", value, onChange }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [field, setField] = useState(FIELDS[0]);
  const [values, setValues] = useState([]); // [{label,count}]

  useEffect(() => {
    if (!open || step !== 2) return;
    (async () => {
      const res = await loadStats({ q: search });
      const map =
        field.key === "status"   ? res.totals.byStatus   :
        field.key === "company"  ? res.totals.byCompany  :
        field.key === "title"    ? res.totals.byTitle    :
        field.key === "location" ? res.totals.byLocation :
        res.totals.byTag;

      const arr = Object.entries(map || {}).map(([label, count]) => ({ label, count }));
      arr.sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));
      setValues(arr);
    })();
  }, [open, step, field, search]);

  function clear() { onChange?.(null); }
  function apply(val) { onChange?.({ key: field.key, value: val }); setOpen(false); setStep(1); }

  if (value) {
    const fld = FIELDS.find(f => f.key === value.key)?.label || value.key;
    return (
      <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-slate-50">
        <span className="font-medium">{fld}:</span>
        <span>{String(value.value)}</span>
        <button onClick={clear} className="text-slate-500 hover:text-slate-800">×</button>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => { setOpen(v => !v); setStep(1); }}
        className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
      >
        Filter
      </button>

      <Dropdown open={open} onClose={() => setOpen(false)}>
        {step === 1 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Step 1 — Field</div>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setField(f); setStep(2); }}
                  className={`rounded border px-2 py-2 text-left hover:bg-slate-50 ${field.key === f.key ? "border-indigo-400" : ""}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Step 2 — {field.label}
              </div>
              <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-800">Back</button>
            </div>
            <div className="max-h-64 overflow-auto divide-y">
              {values.map((v) => (
                <button
                  key={v.label}
                  onClick={() => apply(v.label)}
                  className="flex w-full items-center justify-between px-2 py-2 text-left hover:bg-slate-50"
                >
                  <span className="truncate">{v.label}</span>
                  <span className="text-slate-600">{v.count}</span>
                </button>
              ))}
              {values.length === 0 && (
                <div className="px-2 py-6 text-center text-slate-500 text-sm">No values</div>
              )}
            </div>
          </div>
        )}
      </Dropdown>
    </div>
  );
}
