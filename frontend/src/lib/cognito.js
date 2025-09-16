// src/lib/cognito.js
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import { COGNITO } from "./cfg";

/* ------------------------------------------------------------------
   Basics (email/password)
------------------------------------------------------------------- */

const pool = new CognitoUserPool({
  UserPoolId: COGNITO.userPoolId,
  ClientId: COGNITO.clientId,
});

function decodeJwt(token) {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function signUpEmail(email, password) {
  return new Promise((resolve, reject) => {
    pool.signUp(
      email,
      password,
      [{ Name: "email", Value: email }],
      null,
      (err, data) => (err ? reject(err) : resolve(data))
    );
  });
}

export function confirmEmail(email, code) {
  const user = new CognitoUser({ Username: email, Pool: pool });
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });
}

export function signInEmail(email, password) {
  const user = new CognitoUser({ Username: email, Pool: pool });
  const auth = new AuthenticationDetails({ Username: email, Password: password });

  return new Promise((resolve, reject) => {
    user.authenticateUser(auth, {
      onSuccess: (session) => {
        const idToken = session.getIdToken().getJwtToken();
        const accessToken = session.getAccessToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();
        const claims = decodeJwt(idToken) || {};
        resolve({
          email: claims.email || email,
          sub: claims.sub,
          idToken,
          accessToken,
          refreshToken,
        });
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () =>
        reject({
          code: "PasswordResetRequired",
          message: "New password required",
        }),
    });
  });
}

export function getCurrentSession() {
  return new Promise((resolve) => {
    const current = pool.getCurrentUser();
    if (!current) return resolve(null);
    current.getSession((err, session) => {
      if (err || !session?.isValid()) return resolve(null);
      const idToken = session.getIdToken().getJwtToken();
      const claims = decodeJwt(idToken) || {};
      resolve({
        email: claims.email,
        sub: claims.sub,
        idToken,
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
      });
    });
  });
}

/* ------------------------------------------------------------------
   Hosted UI + PKCE (Google / Facebook / LinkedIn)
------------------------------------------------------------------- */

// tiny helpers
function b64url(uint8) {
  return btoa(String.fromCharCode(...new Uint8Array(uint8)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function randomVerifier(length = 64) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => ("0" + b.toString(16)).slice(-2)).join("");
}
async function codeChallenge(verifier) {
  const enc = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return b64url(new Uint8Array(digest));
}

function hostedBaseUrl(path) {
  const base = COGNITO.hostedDomain.startsWith("http")
    ? COGNITO.hostedDomain
    : `https://${COGNITO.hostedDomain}`;
  return `${base}${path}`;
}

export async function startHostedLogin(provider /* 'Google'|'Facebook'|'LinkedIn' */) {
  const verifier = randomVerifier();
  const challenge = await codeChallenge(verifier);
  sessionStorage.setItem("pkce_verifier", verifier);

  const url = new URL(hostedBaseUrl("/oauth2/authorize"));
  url.searchParams.set("client_id", COGNITO.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", COGNITO.redirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  if (provider) url.searchParams.set("identity_provider", provider);

  window.location.assign(url.toString());
}

export async function handleHostedCallback() {
  const sp = new URLSearchParams(window.location.search);
  const code = sp.get("code");
  if (!code) return null;

  const verifier = sessionStorage.getItem("pkce_verifier");
  if (!verifier) throw new Error("Missing PKCE verifier");

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", COGNITO.clientId);
  body.set("code", code);
  body.set("redirect_uri", COGNITO.redirectUri);
  body.set("code_verifier", verifier);

  const resp = await fetch(hostedBaseUrl("/oauth2/token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status}`);
  const tokens = await resp.json();

  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState({}, "", url.toString());

  const claims = decodeJwt(tokens.id_token) || {};
  return {
    email: claims.email,
    sub: claims.sub,
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
  };
}

export function signOutHosted() {
  const current = pool.getCurrentUser();
  if (current) current.signOut();

  const url = new URL(hostedBaseUrl("/logout"));
  url.searchParams.set("client_id", COGNITO.clientId);
  url.searchParams.set("logout_uri", COGNITO.redirectUri);
  window.location.assign(url.toString());
}
