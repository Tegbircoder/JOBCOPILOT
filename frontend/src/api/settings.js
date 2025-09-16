// src/api/settings.js
import { get, put } from "./client";

// GET /settings/stages -> { ok, stages:[...] } or direct array in some builds
export async function getStages() {
  const r = await get("/settings/stages");
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.stages)) return r.stages;
  return [];
}

// PUT /settings/stages { stages:[...] } -> { ok, saved: ts }
export async function saveStages(stages) {
  return put("/settings/stages", { stages });
}
