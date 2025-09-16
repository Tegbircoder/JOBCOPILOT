// src/pages/LoginCallback.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/authStore";
import { useProfile } from "../lib/profileStore";
import { isValidProfile } from "../lib/RequireProfile";

function Loading() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        <div className="text-sm text-slate-600">Finishing sign-in…</div>
      </div>
    </div>
  );
}

export default function LoginCallback() {
  const nav = useNavigate();
  const { ready: authReady, user, bootstrap } = useAuth();
  const { ready: profileReady, profile, load: loadProfile } = useProfile();

  useEffect(() => {
    // 1. First, we need to get the auth state and token from the URL.
    if (!authReady) {
      bootstrap();
    }
  }, [authReady, bootstrap]);

  useEffect(() => {
    // 2. Once authenticated, we check the profile.
    if (authReady && user) {
      if (!profileReady) {
        // Profile hasn't been loaded, so load it.
        loadProfile();
      } else if (isValidProfile(profile)) {
        // Profile is valid, go to the board!
        nav("/board", { replace: true });
      } else {
        // Profile is invalid, go to onboarding.
        // We can get the user's selected role from local storage or context if needed.
        const role = localStorage.getItem("onboarding_role") || "student";
        nav(`/onboarding?role=${role}`, { replace: true });
      }
    }
  }, [authReady, user, profileReady, profile, nav, loadProfile]);

  // We are always in a loading state while this component works.
  return <Loading />;
}