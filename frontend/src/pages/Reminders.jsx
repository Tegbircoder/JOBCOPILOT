// frontend/src/pages/Reminders.jsx
import { useEffect, useMemo, useState } from "react";
import BoardNav from "../components/board/BoardNav";
import FilterButton from "../components/board/FilterButton";
import {
  getUpcomingReminders,
  // alias to avoid "already declared" collisions in this file
  updateCard as apiUpdateCard,
  isApiEnabled,
} from "../lib/api";

const STAGES = ["Saved", "Applied", "Screening", "Interview", "Final"];

/* -------- date helpers -------- */
function toISODate(dateLike) {
  const d =
    typeof dateLike === "string" && dateLike.length === 10
      ? new Date(dateLike + "T00:00:00Z")
      : new Date(dateLike);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}
function addDaysISO(fromDateLike, n) {
  const base =
    typeof fromDateLike === "string" && fromDateLike.length === 10
      ? new Date(fromDateLike + "T00:00:00Z")
      : fromDateLike
      ? new Date(fromDateLike)
      : new Date();
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function bucketLabel(dateStr) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d = new Date(
    (dateStr?.length === 10 ? dateStr + "T00:00:00Z" : dateStr) || Date.now()
  );
  d.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / 86400000);
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return "Next 7 days";
  return "Later";
}

export default function Reminders() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(() => new Set()); // cardIds being updated

  // single filter
  const [filter, setFilter] = useState({ field: null, value: null, label: "" });

  async function refresh() {
    if (!isApiEnabled) return;
    try {
      setLoading(true);
      setErr("");
      const res = await getUpcomingReminders({ days });
      setItems(Array.isArray(res) ? res : res.items || []);
    } catch (e) {
      setErr(e.message || "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initial
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  // Build data for FilterButton
  const stageDefs = useMemo(
    () => STAGES.map((s) => ({ key: s, name: s })),
    []
  );
  const fbData = useMemo(() => {
    const map = {};
    for (const s of STAGES) map[s] = [];
    for (const r of items) (map[r.status || "Saved"] ||= []).push(r);
    return map;
  }, [items]);

  // Filter items client-side
  const filteredItems = useMemo(() => {
    if (!filter.field || filter.value == null) return items;
    const want = String(filter.value);
    return items.filter((c) => {
      if (filter.field === "stage") return String(c.status || "") === want;
      if (filter.field === "tag")
        return (c.tags || []).some((t) => String(t) === want);
      if (filter.field === "title") return String(c.title || "") === want;
      if (filter.field === "company") return String(c.company || "") === want;
      if (filter.field === "location") return String(c.location || "") === want;
      if (filter.field === "dueDate")
        return String(toISODate(c.dueDate) || "") === want;
      return true;
    });
  }, [items, filter]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const c of filteredItems) {
      if (!c.dueDate) continue;
      const key = bucketLabel(c.dueDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    const order = ["Overdue", "Today", "Tomorrow", "Next 7 days", "Later"];
    return order
      .filter((k) => map.has(k))
      .map((k) => ({ bucket: k, rows: map.get(k) }));
  }, [filteredItems]);

  async function doUpdate(cardId, patch) {
    try {
      setBusy((s) => new Set(s).add(cardId));
      await apiUpdateCard(cardId, patch);
      await refresh();
    } catch (e) {
      console.error("update failed", e);
      alert(e.message || "Update failed");
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(cardId);
        return n;
      });
    }
  }

  async function snooze(card, nDays) {
    const base = card.dueDate ? toISODate(card.dueDate) : toISODate(new Date());
    const next = addDaysISO(base, nDays);
    await doUpdate(card.cardId, { dueDate: next });
  }
  async function clearDue(card) {
    await doUpdate(card.cardId, { dueDate: null });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <BoardNav />
        <FilterButton
          stages={stageDefs}
          data={fbData}
          active={filter}
          onApply={(field, value, label) => setFilter({ field, value, label })}
          onClear={() => setFilter({ field: null, value: null, label: "" })}
        />
      </div>

      {!isApiEnabled && (
        <div className="mb-4 text-red-600">
          API is not configured. Set <code>VITE_API_URL</code> in <code>.env</code>.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="text-sm text-slate-600">
          Showing due in
          <input
            type="number"
            min={1}
            className="mx-2 w-20 rounded border border-slate-300 px-2 py-1"
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 7))}
          />
          days
        </div>
        <button
          onClick={refresh}
          className="ml-auto rounded bg-slate-200 px-3 py-2 text-sm hover:bg-slate-300"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-blue-600">Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      {/* Buckets */}
      <div className="space-y-6">
        {grouped.map(({ bucket, rows }) => (
          <section
            key={bucket}
            className="rounded-xl border border-slate-200 bg-white"
          >
            <header className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">
                {bucket}
                {bucket === "Overdue" && (
                  <span className="ml-2 text-sm text-rose-600">
                    (take action)
                  </span>
                )}
              </h2>
              <div className="text-sm text-slate-500">{rows.length} item(s)</div>
            </header>
            <ul className="divide-y">
              {rows.map((c) => {
                const isBusy = busy.has(c.cardId);
                return (
                  <li
                    key={c.cardId}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {c.title || "Untitled"}{" "}
                        <span className="text-slate-400">·</span>{" "}
                        <span className="text-slate-600">
                          {c.company || "—"}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                          {c.status || "—"}
                        </span>
                        <span>Due: {toISODate(c.dueDate)}</span>
                        {c.location ? (
                          <span className="ml-2">· {c.location}</span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {c.cardId}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={isBusy}
                        onClick={() => snooze(c, 3)}
                        className="rounded bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200 disabled:opacity-50"
                        title="Move due date by 3 days"
                      >
                        Snooze 3d
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => snooze(c, 7)}
                        className="rounded bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200 disabled:opacity-50"
                        title="Move due date by 7 days"
                      >
                        Snooze 7d
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => snooze(c, 14)}
                        className="rounded bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200 disabled:opacity-50"
                        title="Move due date by 14 days"
                      >
                        Snooze 14d
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => clearDue(c)}
                        className="rounded bg-rose-600 px-2 py-1 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
                        title="Remove due date"
                      >
                        Clear
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {grouped.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
            No upcoming due dates in the selected window.
          </div>
        )}
      </div>
    </div>
  );
}
