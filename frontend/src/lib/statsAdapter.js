// src/lib/statsAdapter.js
// loadStats(params) -> { ok, count, totals: { byStatus, byCompany, byTitle, byLocation, byTag } }

import { getStats, isApiEnabled } from "./api";
import { useAuth } from "./authStore";

function storageKey() {
  const uid = useAuth.getState()?.user?.sub || "guest";
  return `jobcopilot_board_v1.${uid}`;
}

function readLocalBoard() {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : { stages: [], data: {} };
  } catch {
    return { stages: [], data: {} };
  }
}

function flatten(board) {
  const out = [];
  for (const st of board.stages || []) {
    for (const c of board.data?.[st.key] || []) {
      out.push({ ...c, status: c.status || st.name || st.key });
    }
  }
  return out;
}

function applyFilters(list, params = {}) {
  const q = String(params.q || "").toLowerCase();
  const want = {
    status: (params.status || "").toLowerCase(),
    company: (params.company || "").toLowerCase(),
    title: (params.title || "").toLowerCase(),
    location: (params.location || "").toLowerCase(),
    tag: (params.tag || "").toLowerCase(),
  };

  return list.filter((r) => {
    if (q) {
      const hay = [
        r.title || "",
        r.company || "",
        r.location || "",
        Array.isArray(r.tags) ? r.tags.join(" ") : ""
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (want.status   && String(r.status   || "").toLowerCase() !== want.status)   return false;
    if (want.company  && String(r.company  || "").toLowerCase() !== want.company)  return false;
    if (want.title    && String(r.title    || "").toLowerCase() !== want.title)    return false;
    if (want.location && String(r.location || "").toLowerCase() !== want.location) return false;
    if (want.tag) {
      const tags = Array.isArray(r.tags) ? r.tags.map(t => String(t).toLowerCase()) : [];
      if (!tags.includes(want.tag)) return false;
    }
    return true;
  });
}

function tally(list, getter) {
  const m = new Map();
  for (const x of list) {
    const k = getter(x) || "—";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Object.fromEntries(m.entries());
}

export async function loadStats(params = {}) {
  // ✅ bug fix: call isApiEnabled()
  if (isApiEnabled()) {
    const res = await getStats(params);
    return res;
  }

  // Local fallback (no API)
  const rows = flatten(readLocalBoard());
  const filtered = applyFilters(rows, params);
  return {
    ok: true,
    count: filtered.length,
    totals: {
      byStatus:   tally(filtered, x => x.status),
      byCompany:  tally(filtered, x => x.company),
      byTitle:    tally(filtered, x => x.title),
      byLocation: tally(filtered, x => x.location),
      byTag:      tally(filtered.flatMap(x => Array.isArray(x.tags) ? x.tags : []), t => t),
    },
  };
}
