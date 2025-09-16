import { useEffect, useMemo, useRef, useState } from "react";

/**
 * One-button, two-step filter:
 * 1) Choose a field
 * 2) Choose a value (unique values with counts)
 *
 * Props:
 *  - stages: [{key, name}]
 *  - data: { [stageKey]: Card[] }
 *  - active: { field: string|null, value: string|null, label?: string }
 *  - onApply(field, value, label)
 *  - onClear()
 */
export default function FilterButton({ stages, data, active, onApply, onClear }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("field"); // "field" | "value"
  const [field, setField] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // close popover on outside click
  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      const withinBtn = btnRef.current?.contains(e.target);
      const withinPop = popRef.current?.contains(e.target);
      if (!withinBtn && !withinPop) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const fields = [
    { key: "title", label: "Title" },
    { key: "company", label: "Company" },
    { key: "location", label: "Location" },
    { key: "stage", label: "Stage" },
    { key: "dueDate", label: "Due Date" },
    { key: "tag", label: "Tag" },
  ];

  // compute values + counts for the selected field
  const values = useMemo(() => {
    if (!field) return [];
    const counts = new Map();
    const bump = (key, label) => {
      if (!key) return;
      const v = counts.get(key);
      if (v) v.count += 1;
      else counts.set(key, { key, label: label ?? key, count: 1 });
    };

    if (field === "stage") {
      for (const st of stages) {
        const list = data[st.key] || [];
        if (list.length > 0) bump(st.key, st.name);
      }
    } else {
      for (const st of stages) {
        for (const c of data[st.key] || []) {
          if (field === "title") bump(c.title, c.title || "Untitled");
          else if (field === "company") bump(c.company, c.company || "—");
          else if (field === "location") bump(c.location, c.location || "—");
          else if (field === "dueDate") bump(c.dueDate, c.dueDate || "—");
          else if (field === "tag") for (const t of c.tags || []) bump(t, t);
        }
      }
    }

    const items = Array.from(counts.values());
    items.sort(
      (a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label))
    );
    return items;
  }, [field, stages, data]);

  // If a filter is active -> show chip with Clear
  if (active?.field && active?.value) {
    const pretty = fields.find((f) => f.key === active.field)?.label || active.field;
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full border bg-white px-3 py-1 text-sm shadow-sm">
          <span className="font-medium">{pretty}:</span>{" "}
          <span className="text-slate-700">{active.label || active.value}</span>
        </span>
        <button onClick={onClear} className="text-sm text-blue-700 hover:underline">
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => {
          setOpen((o) => !o);
          setStep("field");
          setField(null);
        }}
        className="rounded-xl border bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50"
      >
        Filter
      </button>

      {open && (
        <div
          ref={popRef}
          className="absolute z-30 mt-2 w-64 rounded-xl border bg-white p-2 shadow-xl"
        >
          {step === "field" && (
            <div>
              <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Select a field
              </div>
              {fields.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setField(f.key);
                    setStep("value");
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {step === "value" && (
            <div>
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Select a value
                </div>
                <button
                  onClick={() => setStep("field")}
                  className="text-xs text-blue-700 hover:underline"
                >
                  Back
                </button>
              </div>
              <div className="max-h-64 overflow-auto">
                {values.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">No values.</div>
                )}
                {values.map((v) => (
                  <button
                    key={v.key || "__empty__"}
                    onClick={() => {
                      onApply(field, String(v.key || ""), v.label);
                      setOpen(false);
                      setStep("field");
                      setField(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="truncate">{v.label || "—"}</span>
                    <span className="ml-3 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {v.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
