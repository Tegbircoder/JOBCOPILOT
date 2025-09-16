// src/lib/boardStorage.js
// Simple local board storage (no API), *per-user*.

import { useAuth } from "./authStore";

function getUserSub() {
  try {
    const sub = useAuth.getState()?.user?.sub;
    if (sub) return sub;
  } catch {}
  return "guest";
}
function storageKey() {
  return `jobcopilot_board_v1:${getUserSub()}`;
}

const DEFAULT_STAGES = [
  { key: "saved",     name: "SAVED",     limit: null },
  { key: "applied",   name: "APPLIED",   limit: null },
  { key: "screening", name: "SCREENING", limit: null },
  { key: "final",     name: "FINAL",     limit: null },
  { key: "closed",    name: "CLOSED",    limit: null },
];

function nowIso() { return new Date().toISOString(); }
export function nid() { return "c" + Math.random().toString(36).slice(2, 10); }

function blankBoard() {
  return {
    stages: DEFAULT_STAGES,
    data: {
      saved:     [{ id: nid(), title: "RBC", company: "XYZ-2", status: "saved",     createdAt: nowIso(), updatedAt: nowIso(), flagged: false }],
      applied:   [{ id: nid(), title: "TD BANK", company: "XYZ-3", status: "applied",   createdAt: nowIso(), updatedAt: nowIso(), flagged: false }],
      screening: [
        { id: nid(), title: "KPMG", company: "XYZ 4", status: "screening", createdAt: nowIso(), updatedAt: nowIso(), flagged: false },
        { id: nid(), title: "PWC",  company: "XYZ 5", status: "screening", createdAt: nowIso(), updatedAt: nowIso(), flagged: false },
      ],
      final:  [],
      closed: [],
    },
  };
}

function read() {
  try {
    const j = localStorage.getItem(storageKey());
    if (!j) return blankBoard();
    const b = JSON.parse(j);
    b.stages ??= DEFAULT_STAGES;
    b.data ??= { saved: [], applied: [], screening: [], final: [], closed: [] };
    return b;
  } catch {
    return blankBoard();
  }
}

function write(board) {
  localStorage.setItem(storageKey(), JSON.stringify(board));
}

export function loadBoard() { return read(); }
export function saveBoard(board) { write(board); }
export function onExternalChange(fn) {
  const key = storageKey();
  const h = (e) => { if (e.key === key) fn?.(); };
  window.addEventListener("storage", h);
  return () => window.removeEventListener("storage", h);
}
