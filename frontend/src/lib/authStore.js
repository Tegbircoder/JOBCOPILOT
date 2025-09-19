// src/lib/authStore.js
import { create } from "zustand";
import {
  signUpEmail,
  confirmEmail,
  signInEmail,
  getCurrentSession,
  signOutHosted,
  startHostedLogin,
  handleHostedCallback,
} from "./cognito";

function persistTokens(res) {
  try {
    if (!res) return;
    localStorage.setItem("id_token", res.idToken || "");
    localStorage.setItem("access_token", res.accessToken || "");
    if (res.refreshToken) localStorage.setItem("refresh_token", res.refreshToken);
    if (res.email) localStorage.setItem("cognito_user_email", res.email);
    if (res.sub) localStorage.setItem("cognito_user_sub", res.sub);
  } catch {}
}

function clearTokens() {
  ["id_token", "access_token", "refresh_token", "cognito_user_email", "cognito_user_sub"]
    .forEach((k) => localStorage.removeItem(k));
}

// Clear caches that are stored per user (by Cognito sub)
function clearPerUserCaches() {
  try {
    const sub = localStorage.getItem("cognito_user_sub") || "guest";
    localStorage.removeItem(`jobcopilot_board_v1.${sub}`);
    localStorage.removeItem(`jc.stages.v1.${sub}`);
  } catch {}
}

export const useAuth = create((set, get) => ({
  ready: false,
  user: null,        // { email, sub }
  idToken: null,
  accessToken: null,
  refreshToken: null,
  error: null,

  // Load session (also handles Hosted UI callback ?code=...)
  bootstrap: async () => {
    try {
      const hosted = await handleHostedCallback();
      if (hosted) {
        persistTokens(hosted);
        set({
          user: { email: hosted.email, sub: hosted.sub },
          idToken: hosted.idToken,
          accessToken: hosted.accessToken,
          refreshToken: hosted.refreshToken || null,
          error: null,
        });
      } else {
        const res = await getCurrentSession();
        if (res) {
          persistTokens(res);
          set({
            user: { email: res.email, sub: res.sub },
            idToken: res.idToken,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
          });
        }
      }
    } finally {
      set({ ready: true });
    }
  },

  // Email/password
  signUp: (email, password) => signUpEmail(email, password),
  confirm: (email, code) => confirmEmail(email, code),
  signIn: async (email, password) => {
    const res = await signInEmail(email, password);
    persistTokens(res);
    set({
      user: { email: res.email, sub: res.sub },
      idToken: res.idToken,
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      error: null,
    });
    return res;
  },

  // Social (Hosted UI + PKCE)
  signInWithGoogle: () => startHostedLogin("Google"),
  signInWithFacebook: () => startHostedLogin("Facebook"),
  signInWithLinkedIn: () => startHostedLogin("LinkedIn"),

  // Sign out (local + Hosted UI)
  signOut: () => {
    // important: clear per-user caches BEFORE removing the sub from storage
    clearPerUserCaches();
    clearTokens();
    set({ user: null, idToken: null, accessToken: null, refreshToken: null });
    signOutHosted();
  },
}));