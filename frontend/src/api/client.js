// src/api/client.js
export const API =
  import.meta.env?.VITE_API_BASE ||
  process.env.REACT_APP_API_BASE ||
  "";

export const isApiEnabled = /^https?:\/\//.test(API);

const baseHeaders = {
  "x-user-id": "teg-user",
  "Content-Type": "application/json",
};

async function handle(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.message) msg += `: ${j.message}`;
    } catch {}
    throw new Error(msg);
  }
  try { return await res.json(); } catch { return null; }
}

export async function get(path) {
  if (!isApiEnabled) throw new Error("API not configured (set VITE_API_BASE)");
  return handle(await fetch(`${API}${path}`, { headers: baseHeaders }));
}
export async function post(path, body) {
  if (!isApiEnabled) throw new Error("API not configured (set VITE_API_BASE)");
  return handle(await fetch(`${API}${path}`, {
    method: "POST", headers: baseHeaders, body: JSON.stringify(body),
  }));
}
export async function put(path, body) {
  if (!isApiEnabled) throw new Error("API not configured (set VITE_API_BASE)");
  return handle(await fetch(`${API}${path}`, {
    method: "PUT", headers: baseHeaders, body: JSON.stringify(body),
  }));
}
export async function del(path) {
  if (!isApiEnabled) throw new Error("API not configured (set VITE_API_BASE)");
  return handle(await fetch(`${API}${path}`, { method: "DELETE", headers: baseHeaders }));
}
