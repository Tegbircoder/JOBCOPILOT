// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession, getCurrentUser } from "../amplify";
import { useAuth } from "../lib/authStore";
import { useProfile } from "../lib/profileStore";
import { isValidProfile } from "../lib/RequireProfile";

export default function AuthCallback() {
  const nav = useNavigate();
  const { bootstrap } = useAuth();
  const { load: loadProfile } = useProfile();
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) Complete the OAuth code flow (PKCE) and cache tokens
        await fetchAuthSession();

        // 2) Clean the URL (remove ?code / state)
        try {
          const cleanUrl = `${window.location.origin}/auth/callback`;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {}

        // 3) Refresh our auth store (so user is populated)
        await bootstrap();

        // 4) Make sure Cognito indeed sees a signed-in user
        await getCurrentUser();

        // 5) Load profile, then route based on validity
        await loadProfile();

        const u = useAuth.getState().user;
        const p = useProfile.getState().profile;
        const ready = useProfile.getState().ready;

        if (u && ready && isValidProfile(p)) {
          nav("/board", { replace: true });
        } else if (u) {
          nav("/onboarding", { replace: true });
        } else {
          nav("/login", { replace: true });
        }
      } catch (e) {
        console.error(e);
        setError(e?.message || "Sign-in failed");
        nav("/login?error=auth", { replace: true });
      }
    })();
  }, [bootstrap, loadProfile, nav]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        <div className="text-sm text-slate-600">
          {error ? "Redirecting back to login…" : "Completing sign-in…"}
        </div>
      </div>
    </div>
  );
}
