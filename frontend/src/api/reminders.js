// src/api/reminders.js
import { get } from "./client";

export async function getUpcomingReminders({ days = 30, status } = {}) {
  const qs = new URLSearchParams({ days: String(days) });
  if (status) qs.set("status", status);
  const r = await get(`/reminders?${qs.toString()}`);
  return Array.isArray(r) ? r : (r?.items || []);
}
