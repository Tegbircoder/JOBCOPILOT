import { apiGet } from "./client";

export async function getStats(filters = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== "") qs.set(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiGet(`/stats${suffix}`); // -> { ok, count, totals }
}
