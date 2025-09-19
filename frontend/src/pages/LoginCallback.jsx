// src/pages/LoginCallback.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/authStore";
import { useProfile } from "../lib/profileStore";
import { isValidProfile } from "../lib/RequireProfile";
import { Zap, CheckCircle } from "lucide-react";

function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 grid place-items-center relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400 to-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="text-center relative z-10">
        {/* Brand */}
        <div className="inline-flex items-center gap-2 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            JobCopilot
          </h1>
        </div>

        {/* Loading animation */}
        <div className="relative mb-6">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <div className="absolute inset-0 mx-auto h-16 w-16 animate-ping rounded-full bg-indigo-400 opacity-20" />
        </div>

        {/* Loading text with animation */}
        <div className="space-y-2">
          <div className="text-xl font-semibold text-slate-700 flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Almost ready!
          </div>
          <div className="text-slate-600">Finishing your sign-in...</div>
          <div className="text-sm text-slate-400">Setting up your workspace</div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce animation-delay-200"></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce animation-delay-400"></div>
        </div>
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
        nav("/onboarding", { replace: true });
      }
    }
  }, [authReady, user, profileReady, profile, nav, loadProfile]);

  // We are always in a loading state while this component works.
  return <Loading />;
}