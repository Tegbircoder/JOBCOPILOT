// src/lib/token.js
// Find the Cognito **ID token** reliably in localStorage.
// Cognito stores tokens as:
//  CognitoIdentityServiceProvider.<clientId>.<username>.idToken

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
    // Fallback used by our LoginCallback:
    return localStorage.getItem("id_token") || "";
  } catch {
    return "";
  }
}

export function decodeJwt(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
