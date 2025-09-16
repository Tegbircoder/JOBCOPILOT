// src/lib/profileStore.js
import { create } from "zustand";
import cfg from "./cfg";
import { findCognitoIdToken, decodeJwt } from "./token";

const LOCAL_KEY = "profile.basic";

function getIdToken() {
  const t = findCognitoIdToken(cfg.COG_APP_CLIENT_ID);
  return t || "";
}

async function apiGetProfile() {
  if (!/^https?:\/\//.test(cfg.API_URL)) return null;

  try {
    const token = getIdToken();
    const res = await fetch(`${cfg.API_URL}/profile`, {
      method: "GET",
      mode: "cors",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      if (res.status === 401 && import.meta.env.DEV) {
        const claims = token ? decodeJwt(token) : null;
        console.warn("[profileStore] 401 /profile", {
          haveToken: !!token,
          token_use: claims?.token_use,
          aud: claims?.aud,
          iss: claims?.iss,
        });
      }
      return null;
    }

    const data = await res.json().catch(() => null);
    return data?.profile ?? data ?? null;
  } catch (e) {
    if (import.meta.env.DEV) console.info("[profileStore] /profile fetch failed, local cache.", e);
    return null;
  }
}

async function apiPutProfile(profile) {
  if (!/^https?:\/\//.test(cfg.API_URL)) return profile;

  try {
    const token = getIdToken();
    const res = await fetch(`${cfg.API_URL}/profile`, {
      method: "PUT",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(profile),
    });

    if (!res.ok) {
      if (import.meta.env.DEV) console.warn("[profileStore] save failed", res.status);
      return profile;
    }

    const data = await res.json().catch(() => ({}));
    return data?.profile ?? profile;
  } catch (e) {
    if (import.meta.env.DEV) console.info("[profileStore] PUT failed, keeping local copy.", e);
    return profile;
  }
}

export const useProfile = create((set, get) => ({
  ready: false,
  profile: null,
  error: null,

  load: async () => {
    try {
      let p = await apiGetProfile();
      if (!p) {
        const s = localStorage.getItem(LOCAL_KEY);
        if (s) p = JSON.parse(s);
      }
      set({ profile: p || null, error: null, ready: true });
      return p;
    } catch (err) {
      set({ error: err?.message || "Failed to load profile", ready: true });
      return null;
    }
  },

  save: async (updates) => {
    const current = get().profile || {};
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    // local-first
    localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
    const saved = await apiPutProfile(merged);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(saved));
    set({ profile: saved, error: null });
    return saved;
  },

  reset: () => {
    localStorage.removeItem(LOCAL_KEY);
    set({ profile: null });
  },
}));
