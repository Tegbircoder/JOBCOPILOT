// src/lib/cardsAdapter.js
// Repository for cards: prefer API; otherwise use *per-user* localStorage.
// Also handles legacy key migration so users don’t see each other’s cards.

import { isApiEnabled, listCards, createCard, updateCard, deleteCard } from "./api";
import { useAuth } from "./authStore";

/* ---------- helpers: figure out current user, build per-user key ---------- */
function getUserSub() {
  try {
    const sub = useAuth.getState()?.user?.sub;
    if (sub) return sub;

    // Fallback: decode Cognito ID token from localStorage (Amplify format)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("CognitoIdentityServiceProvider.") && k.endsWith(".idToken")) {
        const tok = localStorage.getItem(k);
        if (tok && tok.split(".").length === 3) {
          const payload = JSON.parse(atob(tok.split(".")[1]));
          return payload?.sub || payload?.username || "guest";
        }
      }
    }
  } catch {}
  return "guest";
}

function storageKey() {
  return `jobcopilot_board_v1:${getUserSub()}`;
}

// One-time migration: if old shared key exists, copy to per-user then delete.
function migrateLegacyCache() {
  try {
    const legacyKey = "jobcopilot_board_v1";
    const legacy = localStorage.getItem(legacyKey);
    const perUser = storageKey();
    if (legacy && !localStorage.getItem(perUser)) {
      localStorage.setItem(perUser, legacy);
    }
    if (legacy) localStorage.removeItem(legacyKey);
  } catch {}
}

/* ---------- Local helpers ---------- */
function loadLocalBoard() {
  migrateLegacyCache();
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : { stages: [], data: {} };
  } catch {
    return { stages: [], data: {} };
  }
}
function saveLocalBoard(board) {
  localStorage.setItem(storageKey(), JSON.stringify(board));
}
function flattenLocal(board) {
  const items = [];
  for (const st of board.stages || []) {
    for (const c of board.data?.[st.key] || []) {
      items.push({
        ...c,
        cardId: c.id || c.cardId,
        status: c.status || st.name || st.key,
        _stageKey: st.key,
        _stageName: st.name,
      });
    }
  }
  return items;
}

/* ---------- Public API ---------- */
export async function loadAllCards() {
  if (isApiEnabled) {
    const out = await listCards(); // may return an array OR {items:[]}
    return Array.isArray(out) ? out : (out.items || []);
  }
  const board = loadLocalBoard();
  return flattenLocal(board);
}

export async function createOneCard(payload) {
  if (isApiEnabled) {
    // api.createCard already returns the created card object
    const card = await createCard(payload);
    return card;
  }
  const board = loadLocalBoard();
  const stageKey = payload._stageKey || "saved";
  const list = board.data[stageKey] || [];
  const now = new Date().toISOString();
  const localCard = {
    ...payload,
    id: crypto.randomUUID(),
    cardId: payload.cardId || crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  board.data[stageKey] = [localCard, ...list];
  saveLocalBoard(board);
  return localCard;
}

export async function bulkUpdate(ids = [], patch = {}) {
  if (!Array.isArray(ids) || ids.length === 0) return { ok: true, count: 0 };

  if (isApiEnabled) {
    for (const id of ids) {
      try { await updateCard(id, patch); } catch (e) { console.error("update failed", id, e); }
    }
    return { ok: true, count: ids.length };
  }

  // local
  const board = loadLocalBoard();
  for (const key of Object.keys(board.data || {})) {
    board.data[key] = (board.data[key] || []).map(c => {
      const cid = c.id || c.cardId;
      if (!ids.includes(cid)) return c;
      return { ...c, ...patch, updatedAt: new Date().toISOString() };
    });
  }
  saveLocalBoard(board);
  return { ok: true, count: ids.length };
}

export async function deleteCards(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return { ok: true, count: 0 };

  if (isApiEnabled) {
    for (const id of ids) {
      try { await deleteCard(id); } catch (e) { console.error("delete failed", id, e); }
    }
    return { ok: true, count: ids.length };
  }

  // local
  const board = loadLocalBoard();
  let removed = 0;
  for (const key of Object.keys(board.data || {})) {
    const before = board.data[key] || [];
    const after = before.filter(c => (c.id || c.cardId) && !ids.includes(c.id || c.cardId));
    removed += before.length - after.length;
    board.data[key] = after;
  }
  saveLocalBoard(board);
  return { ok: true, count: removed };
}
