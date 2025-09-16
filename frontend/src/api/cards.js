// src/api/cards.js
import { get, post, put, del } from "./client";

export async function listCards({ limit = 500, q, status, tag, location } = {}) {
  const qs = new URLSearchParams();
  if (limit) qs.set("limit", String(limit));
  if (q) qs.set("q", q);
  if (status) qs.set("status", status);
  if (tag) qs.set("tag", tag);
  if (location) qs.set("location", location);

  const r = await get(`/cards?${qs.toString()}`);
  return Array.isArray(r) ? r : (r?.items || []);
}

export async function createCard(payload) {
  return post("/cards", payload); // -> { ok, cardId, ... }
}

export async function updateCard(cardId, patch) {
  return put(`/cards/${cardId}`, patch);
}

export async function deleteCard(cardId) {
  return del(`/cards/${cardId}`);
}
