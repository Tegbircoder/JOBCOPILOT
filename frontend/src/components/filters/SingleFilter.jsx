// src/components/filters/SingleFilter.jsx
import { useMemo, useState } from "react";

/**
 * Props:
 *  - stages: [{key,name}]
 *  - data: { [stageKey]: Card[] }
 *  - onChange: (filter | null) => void
 *
 * Filter shape: { field: 'title'|'company'|'location'|'stage'|'dueDate'|'tag', valueKey: string, label: string }
 */
export default function SingleFilter({ stages = [], data = {}, onChange }) {
  // UI state (one filter at a time)
  const [field, setField] = useState("");
  const [valueKey, setValueKey] = useState("");
  const [valueLabel, setValueLabel] = useState("");

  // Compute all unique values + counts for the chosen field
  const valueOptions = useMemo(() => {
    if (!field) return [];
    const counts = new Map(); // key -> {label,count}

    const add = (key, label) => {
      if (!key) return;
      const cur = counts.get(key) || { label, count: 0 };
      cur.count += 1;
      counts.set(key, cur);
    };

    if (field === "stage") {
      for (const st of stages) {
        const label = st.name;
        const list = data[st.key] || [];
        if (list.length) add(st.key, label);
      }
    } else {
      for (const st of stages) {
        for (const c of data[st.key] || []) {
          if (field === "title" && c.title) add(c.title, c.title);
          if (field === "company" && c.company) add(c.company, c.company);
          if (field === "location" && c.location) add(c.location, c.location);
          if (field === "dueDate" && c.dueDate) add(c.dueDate, c.dueDate);
          if (field === "tag" && Array.isArray(c.tags)) {
            c.tags.forEach((t) => t && add(String(t), String(t)));
          }
        }
      }
    }

    // Sort by count desc, then label A→Z
    return Array.from(counts.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count }))
      .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));
  }, [field, stages, data]);

  const active = field && valueKey;

  function clearAll() {
    setField("");
    setValueKey("");
    setValueLabel("");
    onChange?.(null);
  }

  function commit(newField, newKey, newLabel) {
    setField(newField);
    setValueKey(newKey);
    setValueLabel(newLabel);
    onChange?.({ field: newField, valueKey: newKey, label: newLabel });
  }

  if (active) {
    // chip mode
    const chipTitle = {
      title: "Title",
      company: "Company",
      location: "Location",
      stage: "Stage",
      dueDate: "Due Date",
      tag: "Tag",
    }[field] || field;

    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm">
        <span className="font-medium text-blue-900">
          {chipTitle}: {valueLabel}
        </span>
        <button
          onClick={clearAll}
          className="rounded-full px-2 py-0.5 text-blue-700 hover:bg-blue-100"
          aria-label="Clear filter"
        >
          × Clear
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* First dropdown: field */}
      <select
        value={field}
        onChange={(e) => {
          setField(e.target.value);
          setValueKey("");
          setValueLabel("");
          onChange?.(null);
        }}
        className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm"
      >
        <option value="">Select a field…</option>
        <option value="title">Title</option>
        <option value="company">Company</option>
        <option value="location">Location</option>
        <option value="stage">Stage</option>
        <option value="dueDate">Due Date</option>
        <option value="tag">Tag</option>
      </select>

      {/* Second dropdown: value (shows counts) */}
      <select
        value={valueKey}
        onChange={(e) => {
          const k = e.target.value;
          const item = valueOptions.find((x) => x.key === k);
          if (!item) return;
          commit(field, item.key, item.label);
        }}
        disabled={!field || valueOptions.length === 0}
        className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm"
      >
        <option value="">
          {field ? "Select a value…" : "Pick a field first"}
        </option>
        {valueOptions.map((v) => (
          <option key={v.key} value={v.key}>
            {v.label} ({v.count})
          </option>
        ))}
      </select>
    </div>
  );
}
