// src/lib/cfg.js
// Read Vite env vars and expose a clean config object.
// Also export a COGNITO helper used by src/lib/cognito.js.

const env = import.meta.env || {};

function noTrailingSlash(url = "") {
  try {
    return String(url).replace(/\/+$/, "");
  } catch {
    return url || "";
  }
}

function hasHttp(url = "") {
  return /^https?:\/\//i.test(String(url || ""));
}

// Default redirect = /login/callback on current origin (works with Hosted UI)
const DEFAULT_REDIRECT =
  typeof window !== "undefined"
    ? `${window.location.origin}/login/callback`
    : "";

// -------- Main config --------
const cfg = {
  // Cognito (email/password + Hosted UI)
  COG_REGION: env.VITE_COG_REGION || "ca-central-1",
  COG_USER_POOL_ID: env.VITE_COG_USER_POOL_ID || "ca-central-1_q8nKkdcza",
  COG_APP_CLIENT_ID: env.VITE_COG_APP_CLIENT_ID || "6i2h8eo8spee1c5n81gm2n6rfq",

  // Hosted UI domain (no trailing slash).
  // Example: "https://jobcopilot-8euuek.auth.ca-central-1.amazoncognito.com"
  COG_HOSTED_DOMAIN: noTrailingSlash(env.VITE_COG_HOSTED_DOMAIN || ""),

  // Redirect URI for Hosted UI (must match the Cognito Allowed callback URL exactly)
  COG_REDIRECT_URI: env.VITE_COG_REDIRECT_URI || DEFAULT_REDIRECT,

  // Backend API base (no trailing slash)
  API_URL: noTrailingSlash(env.VITE_API_URL || ""),

  // IMPORTANT: keep empty when testing real Cognito login
  // (only use during local dev when you want to spoof a user)
  DEV_USER_ID: env.VITE_DEV_USER_ID || "",

  // Optional app display name
  APP_NAME: env.VITE_APP_NAME || "JobCopilot",
};

// -------- Helpers for other modules --------
export const COGNITO = {
  region: cfg.COG_REGION,
  userPoolId: cfg.COG_USER_POOL_ID,
  clientId: cfg.COG_APP_CLIENT_ID,
  hostedDomain: hasHttp(cfg.COG_HOSTED_DOMAIN)
    ? cfg.COG_HOSTED_DOMAIN
    : cfg.COG_HOSTED_DOMAIN
    ? `https://${cfg.COG_HOSTED_DOMAIN}`
    : "",
  redirectUri: cfg.COG_REDIRECT_URI,
};

export const isApiEnabled = /^https?:\/\//.test(cfg.API_URL);
export const APP_NAME = cfg.APP_NAME;

// Light sanity warnings (console only)
if (import.meta.env.DEV) {
  if (!COGNITO.hostedDomain) {
    console.warn(
      "[cfg] VITE_COG_HOSTED_DOMAIN is empty — social login/Hosted UI will not work."
    );
  }
  if (!cfg.API_URL) {
    console.warn("[cfg] VITE_API_URL is empty — API calls will be skipped.");
  }
}

export default cfg;
