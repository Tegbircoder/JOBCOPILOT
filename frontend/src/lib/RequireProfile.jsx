// src/lib/RequireProfile.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import cfg from "./cfg";
import { useAuth } from "./authStore";

/* --------------------------- Small loading state --------------------------- */
function Loading({ note = "Loading your profile…" }) {
  return (
    <div className="min-h-[40vh] grid place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        <div className="text-sm text-slate-600">{note}</div>
      </div>
    </div>
  );
}

/* ------------- Helpers to read the Cognito ID token when needed ------------ */
export function findCognitoIdToken(clientId) {
  try {
    const prefix = `CognitoIdentityServiceProvider.${clientId}.`;
    const suffix = `.idToken`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && k.endsWith(suffix)) {
        const v = localStorage.getItem(k);
        if (v) return v;
      }
    }
    // Fallback key some apps use
    return localStorage.getItem("id_token") || "";
  } catch {
    return "";
  }
}

export function getIdToken() {
  const storeToken = useAuth.getState()?.idToken;
  if (storeToken) return storeToken;
  return findCognitoIdToken(cfg.COG_APP_CLIENT_ID) || "";
}

/* -------------------- Local cache for a faster first paint ------------------ */
export function readProfileLocal() {
  try {
    const s = localStorage.getItem("profile.basic");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

/* --------------------- Robust profile shape validator ---------------------- */
/**
 * Accepts both "old" and "new" shapes:
 * - Old: { name, email, dob, gender, country, city, role: "student|employed",
 *          university? | (jobTitle + expYears?) }
 * - New: { fullName, email, dob, gender, country, city,
 *          backgroundType: "student|experienced",
 *          universityName? | jobExperience? }
 */
export function isValidProfile(p) {
  if (!p) return false;
  const has = (v) => v !== undefined && v !== null && String(v).trim() !== "";

  // Common fields (accept fullName or name)
  const baseOk =
    has(p.fullName || p.name) &&
    has(p.email) &&
    has(p.dob) &&
    has(p.gender) &&
    has(p.country) &&
    has(p.city);

  if (!baseOk) return false;

  // Normalize background/role
  const bgRaw = (p.backgroundType || p.role || "").toString().toLowerCase();

  if (bgRaw === "student") {
    // Accept universityName (new) or university (old)
    return has(p.universityName) || has(p.university);
  }

  if (bgRaw === "experienced" || bgRaw === "employed") {
    // Accept single string jobExperience (new) OR legacy pair jobTitle+expYears
    if (has(p.jobExperience)) return true;
    const yrs = Number(p.expYears);
    return has(p.jobTitle) && !Number.isNaN(yrs) && yrs >= 0 && yrs <= 60;
  }

  return false;
}

/* -------------------- Fetch from API (never throws hard) ------------------- */
export async function fetchProfileApi() {
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

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    // Backend returns { ok: true, profile: {...} }
    return data?.profile ?? data ?? null;
  } catch {
    return null;
  }
}

/* --------------------------- Route guard component ------------------------- */
export default function RequireProfile({ children }) {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [profile, setProfile] = useState(null);
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) Fast path: local cache
      let p = readProfileLocal();

      // 2) If nothing cached, hit the API
      if (!p) {
        p = await fetchProfileApi();
      }

      if (cancelled) return;

      setProfile(p || null);
      setOk(isValidProfile(p));
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loc.key]);

  if (!ready) return <Loading />;

  if (!ok) {
    // Derive sensible role for the onboarding URL
    const bgRaw = (profile?.backgroundType || profile?.role || "").toLowerCase();
    const role =
      bgRaw === "experienced" || bgRaw === "employed" ? "experienced" : "student";
    return <Navigate to={`/onboarding?role=${role}`} replace />;
  }

  return children;
}
