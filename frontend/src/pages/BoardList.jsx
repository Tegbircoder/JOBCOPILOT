// src/pages/BoardList.jsx
import { useEffect, useRef, useState } from "react";
import BoardNav from "../components/board/BoardNav";
import SmartFilter from "../components/filters/SmartFilter";
import { isApiEnabled, listCards } from "../lib/api";
import { loadAllCards, deleteCards, bulkUpdate } from "../lib/cardsAdapter";

function toCSV(rows) {
  const cols = ["cardId", "title", "company", "location", "status", "createdAt", "updatedAt"];
  const esc = (v) =>
    v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return head + "\n" + body;
}
function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function BoardList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(null); // { key, value }
  const [selected, setSelected] = useState(() => new Set());
  const debTimer = useRef();

  function buildParams() {
    const p = {};
    if (search) p.q = search;
    if (filter && filter.key && filter.value) p[filter.key] = filter.value;
    return p;
  }

  async function fetchRows() {
    try {
      setLoading(true);
      setErr("");
      if (isApiEnabled) {
        const res = await listCards(buildParams());
        const items = Array.isArray(res) ? res : res?.items ?? [];
        setRows(items);
      } else {
        // local fallback
        const list = await loadAllCards();
        const q = (search || "").toLowerCase();
        let filtered = !q
          ? list
          : list.filter(
              (r) =>
                (r.title || "").toLowerCase().includes(q) ||
                (r.company || "").toLowerCase().includes(q) ||
                (r.location || "").toLowerCase().includes(q) ||
                (r.status || "").toLowerCase().includes(q) ||
                (Array.isArray(r.tags) ? r.tags.join(" ").toLowerCase() : "").includes(q)
            );
        if (filter?.key && filter?.value) {
          filtered = filtered.filter((r) => {
            if (filter.key === "tag") {
              const tags = Array.isArray(r.tags) ? r.tags : [];
              return tags.some((t) => String(t) === String(filter.value));
            }
            const field = filter.key === "status" ? r.status : r[filter.key];
            return String(field || "") === String(filter.value);
          });
        }
        setRows(filtered);
      }
      setSelected(new Set());
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, []); // first load

  // Debounce typing (and respond to filter changes)
  useEffect(() => {
    clearTimeout(debTimer.current);
    debTimer.current = setTimeout(fetchRows, 300);
    return () => clearTimeout(debTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.cardId));
  const someChecked = rows.some((r) => selected.has(r.cardId)) && !allChecked;

  function toggleRow(id) {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  }
  function toggleAll() {
    const s = new Set(selected);
    (allChecked ? rows : []).forEach((r) => s.delete(r.cardId));
    (!allChecked ? rows : []).forEach((r) => s.add(r.cardId));
    setSelected(s);
  }

  async function handleDeleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} card(s)?`)) return;
    await deleteCards(ids);
    await fetchRows();
  }

  async function handleMarkApplied() {
    const ids = [...selected];
    if (ids.length === 0) return;
    await bulkUpdate(ids, { status: "Applied" });
    await fetchRows();
  }

  function handleExportCSV() {
    download(`cards_${Date.now()}.csv`, toCSV(rows));
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <BoardNav active="list" />
      </div>

      {/* Toolbar: Search + Smart Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search (title/company/location/tags)"
          className="w-72 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring"
        />
        <SmartFilter search={search} value={filter} onChange={setFilter} />
        <button onClick={fetchRows} className="px-3 py-2 rounded bg-slate-200 hover:bg-slate-300">
          Refresh
        </button>

        <div className="mx-2 h-6 w-px bg-slate-200" />
        <button
          onClick={handleMarkApplied}
          disabled={selected.size === 0}
          className={`px-3 py-2 rounded text-white ${
            selected.size ? "bg-amber-500 hover:bg-amber-600" : "bg-amber-300 cursor-not-allowed"
          }`}
        >
          Mark Applied
        </button>
        <button
          onClick={handleDeleteSelected}
          disabled={selected.size === 0}
          className={`px-3 py-2 rounded text-white ${
            selected.size ? "bg-rose-600 hover:bg-rose-700" : "bg-rose-300 cursor-not-allowed"
          }`}
        >
          Delete
        </button>

        <div className="mx-2 h-6 w-px bg-slate-200" />
        <button
          onClick={handleExportCSV}
          className="px-3 py-2 rounded bg-emerald-500 text-white hover:bg-emerald-600"
        >
          Export CSV
        </button>
      </div>

      {loading && <div className="text-blue-600">Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      <div className="overflow-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => el && (el.indeterminate = someChecked)}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Card ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cardId} className="border-t">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(r.cardId)}
                    onChange={() => toggleRow(r.cardId)}
                  />
                </td>
                <td className="px-3 py-2">{r.title || "—"}</td>
                <td className="px-3 py-2">{r.company || "—"}</td>
                <td className="px-3 py-2">{r.location || "—"}</td>
                <td className="px-3 py-2">{r.status || "—"}</td>
                <td className="px-3 py-2 text-slate-500">{r.cardId}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
