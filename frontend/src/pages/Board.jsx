// src/pages/Board.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CardModal from "../components/board/CardModal";
import BoardNav from "../components/board/BoardNav";
import FilterButton from "../components/board/FilterButton";

// API layer
import {
  listCards, createCard, updateCard, deleteCard,
  getStages as apiGetStages, saveStages as apiSaveStages,
  getUpcomingReminders, isApiEnabled
} from "../lib/api";


/* ---------------- constants/helpers ---------------- */

// Light, distinct stage header colors
const PASTEL = [
  "bg-sky-50",
  "bg-emerald-50",
  "bg-amber-50",
  "bg-violet-50",
  "bg-rose-50",
  "bg-teal-50",
  "bg-indigo-50",
  "bg-lime-50",
  "bg-fuchsia-50",
  "bg-cyan-50",
  "bg-orange-50",
];

const STORAGE_KEY = "jobcopilot.stages.v1";

const defaultStages = [
  { key: "saved",     name: "Saved",     color: PASTEL[0], limit: null },
  { key: "applied",   name: "Applied",   color: PASTEL[1], limit: null },
  { key: "screening", name: "Screening", color: PASTEL[2], limit: null },
  { key: "final",     name: "Final",     color: PASTEL[3], limit: null },
  { key: "closed",    name: "Closed",    color: PASTEL[4], limit: null },
];

const titleCase = (s) =>
  String(s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "—";

const norm = (s) => String(s || "").toLowerCase();
const nowIso = () => new Date().toISOString();

function newStageKey(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (slug || "stage") + "-" + Math.random().toString(36).slice(2, 6);
}

function loadStagesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.every((s) => s && s.key)) return parsed;
  } catch {}
  return null;
}
function saveStagesToStorage(stages) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stages)); } catch {}
}

// Ensure every stage has a light color (stable by index if missing)
function withDefaultColors(list) {
  return list.map((s, i) => ({ ...s, color: s.color || PASTEL[i % PASTEL.length] }));
}

/* ---- date helpers (dot + “N days ago”) ---- */
function parseYMD(s) {
  if (!s) return null;
  const d = new Date(s); // supports ISO or YYYY-MM-DD
  return isNaN(d.getTime()) ? null : d;
}
function daysUntil(dateStr) {
  const d = parseYMD(dateStr);
  if (!d) return Infinity; // no next follow-up → safe (green)
  const ms = 24 * 60 * 60 * 1000;
  const today = new Date();
  return Math.floor((d.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / ms);
}
function daysSince(dateStr) {
  const d = parseYMD(dateStr);
  if (!d) return 0;
  const ms = 24 * 60 * 60 * 1000;
  const today = new Date();
  return Math.max(0, Math.floor((today.setHours(0,0,0,0) - d.setHours(0,0,0,0)) / ms));
}
function ageLabel(createdAt) {
  const n = daysSince(createdAt);
  if (n === 0) return "today";
  if (n === 1) return "1 day ago";
  return `${n} days ago`;
}
function followUpDotColor(dueDate) {
  // 7+ days left → green; 1–6 → yellow; overdue/today → red; missing → green
  const d = daysUntil(dueDate);
  if (d === Infinity || d >= 7) return "bg-emerald-500";
  if (d >= 1) return "bg-amber-400";
  return "bg-red-500";
}

/* ---------------- component ---------------- */

export default function Board() {
  const [booted, setBooted] = useState(false);
  const didInitialLoad = useRef(false);
  const apiSaveTimer = useRef(null);

  const [stages, setStages] = useState(defaultStages);
  const [data, setData] = useState(() =>
    Object.fromEntries(defaultStages.map((s) => [s.key, []]))
  );

  const [filter, setFilter] = useState({ field: null, value: null, label: "" });

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("edit");
  const [activeCard, setActiveCard] = useState(null);
  const [activeStageKey, setActiveStageKey] = useState(stages[0].key);

  const [menuOpenKey, setMenuOpenKey] = useState(null);
  const [editingStageKey, setEditingStageKey] = useState(null);
  const [stageNameDraft, setStageNameDraft] = useState("");

  const scrollerRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  /* ---------- boot: load stages then cards ---------- */
  useEffect(() => {
    (async () => {
      let stageList = defaultStages;

      // Load stages (API → localStorage → defaults)
      try {
        if (isApiEnabled) {
          const r = await apiGetStages(); // -> { ok, stages } or array (defensive)
          const fromApi = Array.isArray(r?.stages) ? r.stages : (Array.isArray(r) ? r : null);
          if (Array.isArray(fromApi) && fromApi.length) stageList = fromApi;
        } else {
          const fromLocal = loadStagesFromStorage();
          if (Array.isArray(fromLocal) && fromLocal.length) stageList = fromLocal;
        }
      } catch (e) {
        console.warn("Stage load failed, using local/default:", e?.message || e);
        const fromLocal = loadStagesFromStorage();
        if (Array.isArray(fromLocal) && fromLocal.length) stageList = fromLocal;
      }

      stageList = withDefaultColors(stageList);
      setStages(stageList);
      setData(Object.fromEntries(stageList.map((s) => [s.key, []])));

      // Fetch cards and bucketize (also add missing stage keys if any)
      try {
        const res = await listCards({ limit: 500 }); // -> { ok, items }
        const items = Array.isArray(res) ? res : (res.items || []);

        const known = new Set(stageList.map((s) => s.key));
        const by = Object.fromEntries(stageList.map((s) => [s.key, []]));
        const unseen = new Set();

        for (const it of items) {
          const k = norm(it.status) || "saved";
          if (!known.has(k)) unseen.add(k);
          (by[k] ||= []).push({
            id: it.cardId,
            // core fields shown on board
            title: it.title || "",
            company: it.company || "",
            location: it.location || "",
            // dates/metadata
            dueDate: it.dueDate || "", // “Next follow-up”
            status: k,
            notes: it.notes || "",
            tags: Array.isArray(it.tags) ? it.tags : [],
            flagged: !!it.flagged,
            createdAt: it.createdAt || nowIso(),
            updatedAt: it.updatedAt || nowIso(),
            // NEW fields (kept on the object so edits keep working)
            salary: it.salary ?? "",
            referredBy: it.referredBy ?? "",
            source: it.source ?? "",
            // optional contact
            contactName: it.contactName || "",
            contactEmail: it.contactEmail || "",
            contactPhone: it.contactPhone || "",
            link: it.link || "",
          });
        }

        if (unseen.size) {
          const start = stageList.length;
          const added = Array.from(unseen).map((k, i) => ({
            key: k,
            name: titleCase(k),
            color: PASTEL[(start + i) % PASTEL.length],
            limit: null,
          }));
          const mergedStages = withDefaultColors([...stageList, ...added]);
          setStages(mergedStages);
          for (const a of added) by[a.key] ||= [];
          saveStagesToStorage(mergedStages);
          if (isApiEnabled) { try { await apiSaveStages(mergedStages); } catch {} }
        }

        setData(by);
      } catch (e) {
        console.error("Failed to load cards:", e);
      } finally {
        didInitialLoad.current = true;
        setBooted(true);
      }
    })();
  }, []);

  /* ---------- persist stages on change (debounced API) ---------- */
  useEffect(() => {
    saveStagesToStorage(stages);
    if (!didInitialLoad.current) return;

    if (isApiEnabled) {
      if (apiSaveTimer.current) clearTimeout(apiSaveTimer.current);
      apiSaveTimer.current = setTimeout(async () => {
        try { await apiSaveStages(stages); } catch (e) {
          console.warn("Stage save failed (local only):", e?.message || e);
        }
      }, 800);
    }
    return () => { if (apiSaveTimer.current) clearTimeout(apiSaveTimer.current); };
  }, [stages]);

  /* ---------- scroll helpers ---------- */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateScrollShadows();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);
  function updateScrollShadows() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }
  function scrollByViewport(dir) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  }

  /* ---------- derived ---------- */
  const counts = useMemo(() => {
    const m = {};
    stages.forEach((s) => (m[s.key] = (data[s.key] || []).length));
    return m;
  }, [stages, data]);

  const filteredData = useMemo(() => {
    if (!filter.field || filter.value == null) return data;
    const out = {};
    const want = String(filter.value);
    for (const st of stages) {
      const list = (data[st.key] || []).filter((c) => {
        if (filter.field === "stage")   return c.status === want;
        if (filter.field === "tag")     return (c.tags || []).some((t) => String(t) === want);
        if (filter.field === "title")   return String(c.title || "") === want;
        if (filter.field === "company") return String(c.company || "") === want;
        if (filter.field === "location")return String(c.location || "") === want;
        if (filter.field === "dueDate") return String(c.dueDate || "") === want; // “Next follow-up”
        return true;
      });
      out[st.key] = list;
    }
    return out;
  }, [data, stages, filter]);

  const visibleStages = useMemo(() => {
    if (!filter.field || filter.value == null) return stages;
    return stages.filter((s) => (filteredData[s.key] || []).length > 0);
  }, [stages, filteredData, filter]);

  /* ---------- DnD ---------- */
  async function onDragEnd(result) {
    const { source, destination } = result;
    if (!destination) return;
    const from = source.droppableId;
    const to = destination.droppableId;

    if (from === to) {
      const newCol = Array.from(data[from] || []);
      const [moved] = newCol.splice(source.index, 1);
      newCol.splice(destination.index, 0, moved);
      setData({ ...data, [from]: newCol });
      return;
    }

    const fromCol = Array.from(data[from] || []);
    const toCol = Array.from(data[to] || []);
    const [moved] = fromCol.splice(source.index, 1);
    moved.status = to;
    moved.updatedAt = nowIso();
    toCol.splice(destination.index, 0, moved);
    setData({ ...data, [from]: fromCol, [to]: toCol });

    try { if (moved.id) await updateCard(moved.id, { status: to }); } catch (e) {
      console.error("Persist move failed:", e);
    }
  }

  /* ---------- card CRUD helpers ---------- */
  function openCreate(stageKey) {
    setMode("create");
    setActiveStageKey(stageKey);
    setActiveCard({
      id: null,
      title: "",
      company: "",
      location: "",
      link: "",
      dueDate: "",        // “Next follow-up”
      status: stageKey,
      notes: "",
      tags: [],
      // NEW fields:
      salary: "",
      referredBy: "",
      source: "",
      // contact:
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      flagged: false,
    });
    setOpen(true);
  }
  function openEdit(card, stageKey) {
    setMode("edit");
    setActiveStageKey(stageKey);
    setActiveCard(card);
    setOpen(true);
  }

  async function handleSave(values) {
    try {
      if (mode === "create") {
        const created = await createCard({ ...values, status: values.status || activeStageKey });
        const key = norm(created.status) || activeStageKey;
        const card = {
          id: created.cardId,
          title: created.title ?? values.title ?? "",
          company: created.company ?? values.company ?? "",
          location: created.location ?? values.location ?? "",
          link: created.link ?? values.link ?? "",
          dueDate: created.dueDate ?? values.dueDate ?? "",
          status: key,
          notes: created.notes ?? values.notes ?? "",
          tags: Array.isArray(created.tags) ? created.tags : (values.tags || []),
          flagged: !!(created.flagged ?? values.flagged),
          createdAt: created.createdAt || nowIso(),
          updatedAt: created.updatedAt || nowIso(),
          // NEW fields
          salary: created.salary ?? values.salary ?? "",
          referredBy: created.referredBy ?? values.referredBy ?? "",
          source: created.source ?? values.source ?? "",
          // contact
          contactName: created.contactName ?? values.contactName ?? "",
          contactEmail: created.contactEmail ?? values.contactEmail ?? "",
          contactPhone: created.contactPhone ?? values.contactPhone ?? "",
        };
        setData((prev) => ({ ...prev, [key]: [...(prev[key] || []), card] }));
      } else {
        await updateCard(activeCard.id, values);
        const newKey = norm(values.status || activeCard.status);
        setData((prev) => {
          const next = { ...prev };
          // remove from all columns (avoid duplicates)
          for (const k of Object.keys(next)) {
            next[k] = (next[k] || []).filter((c) => c.id !== activeCard.id);
          }
          const updated = {
            ...activeCard,
            ...values,
            id: activeCard.id,
            status: newKey,
            updatedAt: nowIso(),
          };
          (next[newKey] ||= []).push(updated);
          return next;
        });
      }
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setOpen(false);
    }
  }

  async function handleDeleteCard() {
    if (!confirm("Delete this job card? This cannot be undone.")) return;
    try {
      if (!activeCard?.id) return;
      await deleteCard(activeCard.id);
      setData((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = (next[k] || []).filter((c) => c.id !== activeCard.id);
        }
        return next;
      });
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setOpen(false);
    }
  }

  /* ---------- stage actions ---------- */
  function moveStageLeft(key) {
    setStages((s) => {
      const i = s.findIndex((x) => x.key === key);
      if (i <= 0) return s;
      const copy = [...s];
      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
      return copy;
    });
    setMenuOpenKey(null);
  }
  function moveStageRight(key) {
    setStages((s) => {
      const i = s.findIndex((x) => x.key === key);
      if (i === -1 || i >= s.length - 1) return s;
      const copy = [...s];
      [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
      return copy;
    });
    setMenuOpenKey(null);
  }
  function setStageLimit(key) {
    const current = stages.find((x) => x.key === key)?.limit ?? "";
    const input = prompt("Set column limit (leave empty to clear):", current === null ? "" : String(current));
    if (input === null) return;
    const val = String(input).trim();
    setStages((s) =>
      s.map((st) => (st.key !== key ? st : { ...st, limit: val === "" ? null : Math.max(1, Number(val) || 1) }))
    );
    setMenuOpenKey(null);
  }
  function deleteStage(key) {
    const cardCount = counts[key] ?? 0;
    if (cardCount > 0) {
      alert("Empty this stage first, then delete it.");
      setMenuOpenKey(null);
      return;
    }
    if (!confirm("Delete this stage?")) { setMenuOpenKey(null); return; }
    setStages((s) => s.filter((st) => st.key !== key));
    setData((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setMenuOpenKey(null);
  }

  // inline stage name edit
  function beginEditStageName(stage) {
    setEditingStageKey(stage.key);
    setStageNameDraft(stage.name);
  }
  function commitStageName(key, draft, cancel = false) {
    setStages((s) => {
      if (cancel) return s;
      return s.map((st) => (st.key === key ? { ...st, name: String(draft || "").trim() || st.name } : st));
    });
    setEditingStageKey(null);
    setStageNameDraft("");
  }

  /* ---------------- render ---------------- */

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BoardNav />
          <FilterButton
            stages={stages}
            data={data}
            active={filter}
            onApply={(field, value, label) => setFilter({ field, value, label })}
            onClear={() => setFilter({ field: null, value: null, label: "" })}
          />
        </div>

        <button
          onClick={() => {
            const name = prompt("New stage name?");
            if (!name) return;
            const key = newStageKey(name);
            const color = PASTEL[stages.length % PASTEL.length];
            setStages((s) => [...s, { key, name, color, limit: null }]);
            setData((p) => ({ ...p, [key]: [] }));
            setTimeout(() => {
              const el = scrollerRef.current;
              if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
            }, 0);
          }}
          className="rounded-xl border border-black bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50"
        >
          + Add stage
        </button>
      </div>

      {/* horizontal scroller */}
      <div className="relative">
        {canLeft && <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-white to-transparent" />}
        {canRight && <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-white to-transparent" />}

        {canLeft && (
          <button
            aria-label="Scroll left"
            onClick={() => scrollByViewport(-1)}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border bg-white/90 px-3 py-2 shadow hover:bg-white"
          >
            ‹
          </button>
        )}
        {canRight && (
          <button
            aria-label="Scroll right"
            onClick={() => scrollByViewport(1)}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border bg-white/90 px-3 py-2 shadow hover:bg-white"
          >
            ›
          </button>
        )}

        <div
          ref={scrollerRef}
          className="
            grid grid-flow-col overflow-x-auto scroll-smooth gap-6 pb-2
            snap-x snap-mandatory
            auto-cols-[85%] md:auto-cols-[50%] lg:auto-cols-[33.333%] xl:auto-cols-[25%]
          "
        >
          <DragDropContext onDragEnd={onDragEnd}>
            {visibleStages.map((stage) => {
              const totalCount = counts[stage.key] ?? 0;
              const shownCount = (filteredData[stage.key] || []).length;
              const over = stage.limit != null && totalCount > stage.limit;
              const hasLimit = stage.limit != null;

              return (
                <section
                  key={stage.key}
                  className="snap-start rounded-2xl border border-black bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <header className={`relative flex items-center justify-between rounded-t-2xl border-b px-4 py-3 ${stage.color}`}>
                    <div className="flex-1 text-center">
                      {editingStageKey === stage.key ? (
                        <input
                          autoFocus
                          value={stageNameDraft}
                          onChange={(e) => setStageNameDraft(e.target.value)}
                          onBlur={() => commitStageName(stage.key, stageNameDraft)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitStageName(stage.key, stageNameDraft);
                            if (e.key === "Escape") commitStageName(stage.key, stageNameDraft, true);
                          }}
                          className="mx-auto w-[70%] rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-lg font-extrabold uppercase tracking-wider"
                        />
                      ) : (
                        <button
                          onClick={() => beginEditStageName(stage)}
                          className="mx-auto block text-lg font-extrabold uppercase tracking-wider text-slate-800"
                          title="Click to rename this stage"
                        >
                          {stage.name}
                        </button>
                      )}
                    </div>

                    <div className="absolute left-4 top-3">
                      <span
                        className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-slate-700"
                        title={`${shownCount} shown / ${totalCount} total`}
                      >
                        {shownCount}
                      </span>
                      {hasLimit && (
                        <span title={over ? "Over limit" : "Within limit"} className={over ? "ml-2 text-red-600" : "ml-2 text-green-600"}>
                          {over ? "!" : "✓"}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenKey((k) => (k === stage.key ? null : stage.key));
                      }}
                      className="relative z-20 rounded-md p-1 text-slate-700 hover:bg-white/60"
                      aria-label="Stage menu"
                    >
                      ⋯
                    </button>

                    <div className={`absolute right-2 top-10 z-30 w-56 rounded-xl border bg-white shadow-xl ${menuOpenKey === stage.key ? "" : "hidden"}`}>
                      <button className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => moveStageLeft(stage.key)}>
                        Move column to the left
                      </button>
                      <button className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => moveStageRight(stage.key)}>
                        Move column to the right
                      </button>
                      <button className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => setStageLimit(stage.key)}>
                        Set column limit {hasLimit ? `(current: ${stage.limit})` : ""}
                      </button>
                      <div className="my-1 h-px bg-slate-200" />
                      <button
                        className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        onClick={() => deleteStage(stage.key)}
                        disabled={totalCount > 0}
                        title={totalCount > 0 ? "Empty this stage first to delete it" : "Delete this stage"}
                      >
                        Delete
                      </button>
                    </div>
                  </header>

                  <Droppable droppableId={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[720px] space-y-3 p-4 transition-colors ${snapshot.isDraggingOver ? "bg-slate-50" : ""}`}
                      >
                        {(filteredData[stage.key] || []).map((card, index) => (
                          <Draggable draggableId={String(card.id)} index={index} key={card.id}>
                            {(provided, snapshot) => {
                              const open = () => { if (!snapshot.isDragging) openEdit(card, stage.key); };
                              const dot = followUpDotColor(card.dueDate);
                              return (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={open}
                                  style={{ ...provided.draggableProps.style, userSelect: "none", cursor: snapshot.isDragging ? "grabbing" : "pointer" }}
                                  className={`relative rounded-xl border border-black bg-white p-4 text-[15px] transition-all duration-150
                                    ${snapshot.isDragging ? "shadow-lg ring-1 ring-slate-200" : "shadow-sm hover:shadow-lg hover:scale-[1.02]"}
                                  `}
                                >
                                  {/* status dot (top-right) */}
                                  <span className={`absolute right-3 top-3 inline-block h-3.5 w-3.5 rounded-full ${dot}`} />

                                  {/* ONLY Position (title) + company · location */}
                                  <div className="min-w-0 pr-6">
                                    <div className="truncate font-semibold text-slate-900">{card.title || "Untitled"}</div>
                                    <div className="truncate text-xs text-slate-500">
                                      {card.company || "—"} {card.location ? `· ${card.location}` : ""}
                                    </div>
                                  </div>

                                  {/* age bottom-right */}
                                  <div className="pointer-events-none absolute bottom-2 right-3 text-xs text-slate-400">
                                    {ageLabel(card.createdAt)}
                                  </div>
                                </div>
                              );
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        <div className="flex items-center justify-center p-1">
                          <button onClick={() => openCreate(stage.key)} className="w-full rounded-lg border border-dashed border-black px-3 py-2 text-slate-500 hover:bg-slate-50">
                            + Add card
                          </button>
                        </div>
                      </div>
                    )}
                  </Droppable>
                </section>
              );
            })}
          </DragDropContext>
        </div>
      </div>

      <CardModal
        open={open}
        mode={mode}
        initial={activeCard}
        stages={stages}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        onDelete={handleDeleteCard}
      />
    </div>
  );
}
