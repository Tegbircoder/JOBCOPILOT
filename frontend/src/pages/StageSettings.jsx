// src/pages/StageSettings.jsx
import { useEffect, useMemo, useState } from "react";
import { getStages, saveStages, listCards } from "../lib/api";
import BoardNav from "../components/board/BoardNav";

const DEFAULTS = [
  { key: "saved",     name: "Saved",     color: "bg-sky-50",     limit: null },
  { key: "applied",   name: "Applied",   color: "bg-emerald-50", limit: null },
  { key: "screening", name: "Screening", color: "bg-amber-50",   limit: null },
  { key: "final",     name: "Final",     color: "bg-violet-50",  limit: null },
  { key: "closed",    name: "Closed",    color: "bg-rose-50",    limit: null },
];

const COLOR_OPTIONS = [
  { label: "Auto (no color)", value: null },
  { label: "Sky (light blue)", value: "bg-sky-50" },
  { label: "Emerald (light green)", value: "bg-emerald-50" },
  { label: "Amber (light orange)", value: "bg-amber-50" },
  { label: "Violet (light purple)", value: "bg-violet-50" },
  { label: "Rose (light pink)", value: "bg-rose-50" },
  { label: "Teal (light teal)", value: "bg-teal-50" },
];

const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "") || "stage";

export default function StageSettings() {
  const [stages, setStages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  // count cards by status so we can block deletion when not empty
  const [counts, setCounts] = useState({}); // { [stageKey]: number }

  async function refreshCounts() {
    try {
      const res = await listCards({ limit: 500 });
      const items = Array.isArray(res) ? res : (res.items || []);
      const m = {};
      for (const it of items) {
        const k = String(it.status || "saved").toLowerCase();
        m[k] = (m[k] || 0) + 1;
      }
      setCounts(m);
    } catch (e) {
      // if API disabled/fails, keep counts empty so we don't hard-block
      setCounts({});
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const s = await getStages();
        setStages(Array.isArray(s) && s.length ? s : DEFAULTS);
      } catch (e) {
        setErr(e.message || "Failed to load");
        setStages(DEFAULTS);
      } finally {
        // try to load counts after stages
        refreshCounts();
      }
    })();
  }, []);

  function addRow() {
    setStages((s) => [
      ...s,
      { key: `stage-${s.length + 1}`, name: "New Stage", color: null, limit: null },
    ]);
  }
  function removeRow(i) {
    const row = stages[i];
    const k = slug(row.key);
    const count = counts[k] || 0;
    if (count > 0) {
      alert(`This stage has ${count} card(s). Please empty the stage first.`);
      return;
    }
    setStages((s) => s.filter((_, idx) => idx !== i));
  }
  function updateRow(i, patch) {
    setStages((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function validate() {
    const keys = new Set();
    for (const [i, st] of stages.entries()) {
      const k = slug(st.key);
      const nm = String(st.name || "").trim();
      if (!nm) throw new Error(`Row ${i + 1}: name is required`);
      if (!k) throw new Error(`Row ${i + 1}: key is required`);
      if (keys.has(k)) throw new Error(`Row ${i + 1}: duplicate key "${k}"`);
      keys.add(k);
      const lim = st.limit;
      if (lim != null && lim !== "" && (!Number.isFinite(Number(lim)) || Number(lim) < 1)) {
        throw new Error(`Row ${i + 1}: limit must be empty or ≥ 1`);
      }
    }
  }

  async function onSave() {
    try {
      setBusy(true); setErr("");
      validate();
      const payload = stages.map((st) => ({
        key: slug(st.key),
        name: String(st.name || "").trim(),
        color: st.color == null || st.color === "" ? null : String(st.color),
        limit: st.limit == null || st.limit === "" ? null : Math.max(1, Number(st.limit) || 1),
      }));
      await saveStages(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
      await refreshCounts(); // update counts after save
    } catch (e) {
      setErr(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const totalCards = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts]
  );

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <BoardNav />
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            Cards on board: <b className="text-slate-900">{totalCards}</b>
          </span>
          <button
            onClick={() => setStages(DEFAULTS)}
            className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
          >
            Reset to defaults
          </button>
          <button
            disabled={busy}
            onClick={onSave}
            className="rounded bg-black px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>

      {err && <div className="mb-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-rose-800">{err}</div>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Limit</th>
              <th className="px-3 py-2">Color</th>
              <th className="px-3 py-2 w-24">Cards</th>
              <th className="px-3 py-2 w-16"> </th>
            </tr>
          </thead>
          <tbody>
            {stages.map((st, i) => {
              const k = slug(st.key);
              const count = counts[k] || 0;
              return (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      value={st.key}
                      onChange={(e) => updateRow(i, { key: e.target.value })}
                      className="w-48 rounded border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={st.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      className="w-64 rounded border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="(optional)"
                      value={st.limit ?? ""}
                      onChange={(e) => updateRow(i, { limit: e.target.value })}
                      className="w-32 rounded border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={st.color ?? ""}
                      onChange={(e) => updateRow(i, { color: e.target.value || null })}
                      className="w-44 rounded border px-2 py-1"
                    >
                      {COLOR_OPTIONS.map((opt) => (
                        <option key={String(opt.value)} value={opt.value ?? ""}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-sm tabular-nums">{count}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => removeRow(i)}
                      className="rounded bg-rose-600 px-2 py-1 text-sm text-white hover:bg-rose-700"
                      title={count > 0 ? "Stage has cards — empty first" : "Remove"}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t">
              <td colSpan={6} className="px-3 py-3">
                <button
                  onClick={addRow}
                  className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  + Add stage
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Keys must be unique (lowercase letters/numbers/dashes). Name is what you see on the board.
        Limit is optional. A stage can be removed only if it has no cards.
      </p>
    </div>
  );
}
