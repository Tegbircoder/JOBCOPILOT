// src/lib/pkce.js
function b64url(uint8) {
  return btoa(String.fromCharCode(...new Uint8Array(uint8)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomVerifier(length = 64) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => ("0" + b.toString(16)).slice(-2)).join("");
}

export async function challengeFromVerifier(verifier) {
  const enc = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return b64url(new Uint8Array(digest));
}
