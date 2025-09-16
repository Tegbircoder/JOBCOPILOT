// frontend/src/pages/List.jsx
import { useEffect, useMemo, useState } from "react";
import BoardNav from "../components/board/BoardNav";
import CardModal from "../components/board/CardModal";
import { listCards, updateCard, deleteCard } from "../lib/api";

/* ---------- helpers ---------- */
const titleCase = (s) =>
  String(s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "—";
const norm = (s) => String(s || "").toLowerCase();

function parseYMD(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function daysUntil(dateStr) {
  const d = parseYMD(dateStr);
  if (!d) return Infinity;
  const ms = 24 * 60 * 60 * 1000;
  const today = new Date();
  return Math.floor((d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / ms);
}
function daysSince(dateStr) {
  const d = parseYMD(dateStr);
  if (!d) return 0;
  const ms = 24 * 60 * 60 * 1000;
  const today = new Date();
  return Math.max(0, Math.floor((today.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / ms));
}
function ageLabel(createdAt) {
  const n = daysSince(createdAt);
  if (n === 0) return "today";
  if (n === 1) return "1 day ago";
  return `${n} days ago`;
}
function followUpDotColor(dueDate) {
  const d = daysUntil(dueDate);
  if (d === Infinity || d >= 7) return "bg-emerald-500";
  if (d >= 1) return "bg-amber-400";
  return "bg-red-500";
}

const PAGE_SIZE = 25;

/* ---------- component ---------- */
export default function List() {
  // Raw data
  const [allRows, setAllRows] = useState([]);

  // Filters
  const [q, setQ] = useState("");
  const [fStage, setFStage] = useState("");
  const [fCompany, setFCompany] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fTag, setFTag] = useState("");

  // UI
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(() => new Set());

  // Modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("edit");
  const [active, setActive] = useState(null);
  const [stages, setStages] = useState([]);

  // Pagination
  const [page, setPage] = useState(0);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await listCards({ limit: 1000 });
      const items = Array.isArray(res) ? res : res.items || [];
      setAllRows(items);
      // derive stage list for the modal
      const foundStages = Array.from(new Set(items.map((c) => norm(c.status || "saved")))).map(
        (k) => ({ key: k, name: titleCase(k) })
      );
      setStages(foundStages);
      setPage(0);
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleRow(id) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function isSelected(id) {
    return selected.has(id);
  }
  function clearSelection() {
    setSelected(new Set());
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} card(s)?`)) return;
    try {
      setLoading(true);
      await Promise.all(ids.map((id) => deleteCard(id)));
      clearSelection();
      await load();
    } catch (e) {
      alert(e.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  // Distinct values for dropdowns
  const options = useMemo(() => {
    const stages = new Set();
    const companies = new Set();
    const locations = new Set();
    const tags = new Set();

    for (const r of allRows) {
      stages.add(norm(r.status) || "saved");
      const c = (r.company && r.company.trim()) ? r.company.trim() : "—";
      const l = (r.location && r.location.trim()) ? r.location.trim() : "—";
      companies.add(c);
      locations.add(l);
      (Array.isArray(r.tags) ? r.tags : String(r.tags || "").split(","))
        .map((t) => String(t).trim())
        .filter(Boolean)
        .forEach((t) => tags.add(t));
    }

    return {
      stages: Array.from(stages).sort(),
      companies: Array.from(companies).sort((a, b) => a.localeCompare(b)),
      locations: Array.from(locations).sort((a, b) => a.localeCompare(b)),
      tags: Array.from(tags).sort((a, b) => a.localeCompare(b)),
    };
  }, [allRows]);

  // Apply filters
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return allRows.filter((r) => {
      if (fStage && norm(r.status) !== fStage) return false;
      if (fCompany && (r.company || "—").trim() !== fCompany) return false;
      if (fLocation && (r.location || "—").trim() !== fLocation) return false;
      if (fTag) {
        const tags = Array.isArray(r.tags) ? r.tags : String(r.tags || "").split(",");
        if (!tags.some((t) => String(t).trim() === fTag)) return false;
      }
      if (!text) return true;
      const hay = `${r.title || ""} ${r.company || ""} ${r.location || ""} ${String(
        Array.isArray(r.tags) ? r.tags.join(" ") : r.tags || ""
      )}`.toLowerCase();
      return hay.includes(text);
    });
  }, [allRows, q, fStage, fCompany, fLocation, fTag]);

  // Pagination slice
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function resetFilters() {
    setQ("");
    setFStage("");
    setFCompany("");
    setFLocation("");
    setFTag("");
    setPage(0);
  }

  /* ----- modal helpers ----- */
  function openEdit(card) {
    setMode("edit");
    setActive({
      id: card.cardId,
      title: card.title || "",
      status: norm(card.status) || "saved",
      dueDate: card.dueDate || "",
      company: card.company || "",
      location: card.location || "",
      link: card.link || "",
      tags: Array.isArray(card.tags) ? card.tags : [],
      notes: card.notes || "",
      salary: card.salary ?? "",
      referredBy: card.referredBy ?? "",
      source: card.source ?? "",
      contactName: card.contactName || "",
      contactEmail: card.contactEmail || "",
      contactPhone: card.contactPhone || "",
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    });
    setOpen(true);
  }

  async function handleSave(values) {
    try {
      await updateCard(active.id, values);
      setAllRows((prev) =>
        prev.map((c) =>
          c.cardId === active.id ? { ...c, ...values, status: norm(values.status || c.status) } : c
        )
      );
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setOpen(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this job card? This cannot be undone.")) return;
    try {
      await deleteCard(active.id);
      setAllRows((prev) => prev.filter((c) => c.cardId !== active.id));
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setOpen(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <BoardNav />
      </div>

      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          placeholder="Search (position/company/location/tag)"
          className="w-[360px] max-w-[90vw] rounded border px-3 py-2"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />

        {/* Stage */}
        <select
          className="rounded border px-3 py-2 text-sm"
          value={fStage}
          onChange={(e) => {
            setFStage(e.target.value);
            setPage(0);
          }}
          title="Filter by stage"
        >
          <option value="">Stage: All</option>
          {options.stages.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>

        {/* Company */}
        <select
          className="rounded border px-3 py-2 text-sm"
          value={fCompany}
          onChange={(e) => {
            setFCompany(e.target.value);
            setPage(0);
          }}
          title="Filter by company"
        >
          <option value="">Company: All</option>
          {options.companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Location */}
        <select
          className="rounded border px-3 py-2 text-sm"
          value={fLocation}
          onChange={(e) => {
            setFLocation(e.target.value);
            setPage(0);
          }}
          title="Filter by location"
        >
          <option value="">Location: All</option>
          {options.locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        {/* Tag */}
        <select
          className="rounded border px-3 py-2 text-sm"
          value={fTag}
          onChange={(e) => {
            setFTag(e.target.value);
            setPage(0);
          }}
          title="Filter by tag"
        >
          <option value="">Tag: All</option>
          {options.tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          onClick={load}
          className="rounded bg-slate-200 px-3 py-2 text-sm hover:bg-slate-300"
        >
          Refresh
        </button>
        <button
          onClick={resetFilters}
          className="rounded bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
        >
          Reset
        </button>

        <div className="ml-auto text-sm text-slate-600">
          {loading ? (
            "Loading…"
          ) : err ? (
            <span className="text-red-600">Error: {err}</span>
          ) : (
            `${filtered.length} shown (of ${allRows.length})`
          )}
        </div>
      </div>

      {/* Row actions */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={bulkDelete}
          className="rounded bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
          disabled={!selected.size}
        >
          Delete
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page <= 0}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
          <span className="text-sm text-slate-500">
            {page + 1} / {pageCount}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-black bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr className="[&>th]:px-3 [&>th]:py-2">
              <th className="w-10"></th>
              <th>Position name</th>
              <th>Company</th>
              <th>Location</th>
              <th>Source</th>
              <th>Salary</th>
              <th>Next follow-up</th>
              <th>Stage</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  No cards yet.
                </td>
              </tr>
            )}
            {pageRows.map((c) => {
              const dot = followUpDotColor(c.dueDate);
              return (
                <tr
                  key={c.cardId}
                  onClick={() => openEdit(c)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected(c.cardId)}
                      onChange={() => toggleRow(c.cardId)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
                      <span className="font-medium text-slate-900">
                        {c.title || "Untitled"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{c.company || "—"}</td>
                  <td className="px-3 py-2">{c.location || "—"}</td>
                  <td className="px-3 py-2">{c.source || "—"}</td>
                  <td className="px-3 py-2">
                    {c.salary == null || c.salary === "" ? "—" : c.salary}
                  </td>
                  <td className="px-3 py-2">{c.dueDate || "—"}</td>
                  <td className="px-3 py-2 capitalize">{norm(c.status) || "saved"}</td>
                  <td className="px-3 py-2 text-slate-500">{ageLabel(c.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CardModal
        open={open}
        mode={mode}
        initial={active}
        stages={stages}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
