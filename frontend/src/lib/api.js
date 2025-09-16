// src/lib/api.js
// Single source of truth for talking to the backend (profile, cards, stages, stats, reminders)

import cfg from "./cfg";
import { getIdToken } from "./RequireProfile";

/* ---------------------- base + feature flag ---------------------- */

const BASE = String(cfg.API_URL || "").replace(/\/$/, "");
export function isApiEnabled() {
  return /^https?:\/\//.test(BASE);
}

/* ---------------------- auth/dev headers ---------------------- */

function buildAuthHeaders() {
  const headers = { Accept: "application/json" };

  // JWT from Cognito (Amplify/Hosted UI). Safe even before auth.
  const idToken = getIdToken?.() || null;
  if (idToken) {
    headers.Authorization = idToken.startsWith("Bearer ")
      ? idToken
      : `Bearer ${idToken}`;
  }

  // Optional dev override so your Lambda can accept x-user-id in non-JWT flows
  if (cfg.DEV_USER_ID) {
    headers["x-user-id"] = cfg.DEV_USER_ID;
  }

  return headers;
}

/* ---------------------- tiny HTTP wrapper ---------------------- */

async function http(method, path, body) {
  if (!isApiEnabled()) throw new Error("API URL not configured. Set VITE_API_URL.");
  const headers = buildAuthHeaders();
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    mode: "cors",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return { ok: true };

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok || data?.ok === false) {
    const msg =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      res.statusText ||
      "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    err.code = data?.error?.code;
    err.details = data?.error?.details;
    throw err;
  }

  return data;
}

/* ---------------------- Profile ---------------------- */

export async function getProfile() {
  const out = await http("GET", "/profile");
  return out.profile ?? null;
}

export async function putProfile(profile) {
  const out = await http("PUT", "/profile", profile);
  return out.profile ?? profile;
}

/* ---------------------- Cards ---------------------- */

export async function listCards(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) {
    const s = Array.isArray(params.status) ? params.status.join(",") : String(params.status);
    if (s) qs.set("status", s);
  }
  if (params.q) qs.set("q", params.q);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.cursor) qs.set("cursor", params.cursor); // backend can ignore if not used

  const out = await http("GET", `/cards${qs.toString() ? `?${qs}` : ""}`);

  // Simple shape when no filters requested
  if (!Object.keys(params).length) return out.items ?? out.cards ?? [];

  // Rich shape for paginated/filtered calls
  return {
    items: out.items ?? out.cards ?? [],
    nextCursor:
      out.nextCursor ??
      out.pageToken ??
      out.nextToken ??
      out.nextKey ??
      null,
    count: out.count ?? (out.items?.length || 0),
  };
}

export async function createCard(partial) {
  const out = await http("POST", "/cards", partial);
  return out.card ?? out.item ?? { ...partial, ...out };
}

export async function updateCard(cardId, patch) {
  const out = await http("PUT", `/cards/${encodeURIComponent(cardId)}`, patch);
  return out.card ?? out.item ?? { cardId, ...patch, ...out };
}

export async function deleteCard(cardId) {
  await http("DELETE", `/cards/${encodeURIComponent(cardId)}`);
  return true;
}

/* ---------------------- Stats ---------------------- */

export async function getStats(params = {}) {
  const qs = new URLSearchParams(params);
  return http("GET", `/stats${qs.toString() ? `?${qs}` : ""}`);
}

/* ---------------------- Reminders ---------------------- */

export async function getUpcomingReminders(opts = {}) {
  const qs = new URLSearchParams();
  if (opts.days != null) qs.set("days", String(opts.days));
  if (Array.isArray(opts.status) && opts.status.length)
    qs.set("status", opts.status.join(","));

  try {
    const out = await http("GET", `/reminders${qs.toString() ? `?${qs}` : ""}`);
    return out.items ?? out.upcoming ?? [];
  } catch (e) {
    // fallback for older backend path
    if (e.status === 404 || /not found/i.test(e.message || "")) {
      const out2 = await http("GET", `/reminders/upcoming${qs.toString() ? `?${qs}` : ""}`);
      return out2.items ?? out2.upcoming ?? [];
    }
    throw e;
  }
}

/* ---------------------- Stage settings ---------------------- */

export async function getStages() {
  const out = await http("GET", "/settings/stages");
  return out.stages ?? [];
}

export async function saveStages(stages) {
  if (!Array.isArray(stages)) throw new Error("stages must be an array");
  const out = await http("PUT", "/settings/stages", { stages });
  return out.stages ?? stages;
}

export default {
  isApiEnabled,
  getProfile,
  putProfile,
  listCards,
  createCard,
  updateCard,
  deleteCard,
  getStats,
  getUpcomingReminders,
  getStages,
  saveStages,
};
