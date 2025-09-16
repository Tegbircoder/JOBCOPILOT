// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/authStore";
import { useProfile } from "../lib/profileStore";
import { isValidProfile } from "../lib/RequireProfile";

/* ---------- UI bits ---------- */
function SocialButton({ icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 hover:bg-slate-50 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1 text-sm border ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Page ---------- */
export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  // auth store
  const {
    ready: authReady,
    user,
    bootstrap,
    signIn,
    signUp,
    confirm,
    signInWithGoogle,
    signInWithFacebook,
    signInWithLinkedIn,
  } = useAuth();

  // profile store
  const {
    ready: profileReady,
    profile,
    load: loadProfile,
  } = useProfile();

  // tabs: signin | signup | confirm
  const preselect = params.get("mode");
  const [tab, setTab] = useState(preselect === "signup" ? "signup" : "signin");

  // role: student | employed (used on sign-up → onboarding)
  const roleFromLink = params.get("role");
  const [role, setRole] = useState(
    roleFromLink === "employed" ? "employed" : "student"
  );

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  /* ---------- bootstrap auth session once ---------- */
  useEffect(() => {
    if (!authReady) bootstrap();
  }, [authReady, bootstrap]);

  /* ---------- redirect logic ---------- */
  useEffect(() => {
    // If authenticated
    if (authReady && user) {
      // Ensure profile is loaded
      if (!profileReady) {
        loadProfile();
        return;
      }
      // Once profile is ready, decide where to go
      if (isValidProfile(profile)) {
        nav("/board", { replace: true });
      } else {
        nav(`/onboarding?role=${role}`, { replace: true });
      }
    }
  }, [authReady, user, profileReady, profile, role, nav, loadProfile]);

  /* ---------- actions ---------- */
  async function doSignIn(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      // auth state effect will navigate
    } catch (err) {
      setMsg(err?.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function doSignUp(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await signUp(email.trim(), password);
      setTab("confirm"); // typical Cognito flow
    } catch (err) {
      setMsg(err?.message || "Sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  async function doConfirm(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await confirm(email.trim(), code.trim());
      setMsg("Email confirmed — you can now sign in.");
      setTab("signin");
    } catch (err) {
      setMsg(err?.message || "Confirmation failed");
    } finally {
      setBusy(false);
    }
  }

  // Safe social wrappers (show “coming soon” if not wired)
  const safeSocial = (fn, name) => async () => {
    setMsg(null);
    setBusy(true);
    try {
      if (typeof fn === "function") {
        await fn();
      } else {
        alert(`${name} login will be added after we connect the provider in Cognito.`);
      }
    } catch (err) {
      setMsg(err?.message || `${name} login failed`);
    } finally {
      setBusy(false);
    }
  };

  const isCheckingSession = !authReady || (user && !profileReady);
  if (isCheckingSession) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          <div className="text-sm text-slate-600">Checking your session…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Brand */}
        <div className="mb-6 text-slate-900 font-semibold">JobCopilot</div>

        {/* Card */}
        <div className="rounded-3xl bg-white shadow-card border border-slate-200 p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl md:text-3xl font-extrabold text-slate-900">Log in</h1>

            <div className="text-sm">
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setRole("student");
                }}
                className="text-blue-600 hover:underline mr-2"
              >
                Sign up as a student
              </button>
              or
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setRole("employed");
                }}
                className="text-blue-600 hover:underline ml-2"
              >
                Sign up as tutor
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-5">
            <TabButton active={tab === "signin"} onClick={() => setTab("signin")}>
              Sign in
            </TabButton>
            <TabButton active={tab === "signup"} onClick={() => setTab("signup")}>
              Sign up
            </TabButton>
            <TabButton active={tab === "confirm"} onClick={() => setTab("confirm")}>
              Confirm
            </TabButton>

            {tab === "signup" && (
              <div className="ml-auto flex items-center gap-2 text-sm">
                <span className="text-slate-600">Role:</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="border rounded-lg px-2 py-1"
                >
                  <option value="student">Student</option>
                  <option value="employed">Employed (job seeker)</option>
                </select>
              </div>
            )}
          </div>

          {/* Socials */}
          <div className="space-y-3">
            <SocialButton
              label="Continue with Google"
              onClick={safeSocial(signInWithGoogle, "Google")}
              disabled={busy}
              icon={<span className="inline-block size-4 rounded bg-white border border-slate-300" />}
            />
            <SocialButton
              label="Continue with Facebook"
              onClick={safeSocial(signInWithFacebook, "Facebook")}
              disabled={busy}
              icon={<span className="inline-block size-4 rounded bg-white border border-slate-300" />}
            />
            <SocialButton
              label="Continue with LinkedIn"
              onClick={safeSocial(signInWithLinkedIn, "LinkedIn")}
              disabled={busy}
              icon={<span className="inline-block size-4 rounded bg-white border border-slate-300" />}
            />
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px grow bg-slate-200" />
            <span className="text-xs text-slate-500">or</span>
            <div className="h-px grow bg-slate-200" />
          </div>

          {/* Forms */}
          {tab === "signin" && (
            <form onSubmit={doSignIn} className="space-y-4">
              <div>
                <label className="text-sm text-slate-600">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </div>

              {msg && <p className="text-sm text-rose-600">{msg}</p>}

              <div className="flex items-center gap-2">
                <input id="remember" type="checkbox" className="h-4 w-4" defaultChecked />
                <label htmlFor="remember" className="text-sm text-slate-700">
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-pink-500 text-white py-3 font-semibold hover:bg-pink-600 disabled:opacity-50"
              >
                {busy ? "Signing in…" : "Log in"}
              </button>
            </form>
          )}

          {tab === "signup" && (
            <form onSubmit={doSignUp} className="space-y-4">
              <div>
                <label className="text-sm text-slate-600">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
              </div>

              {msg && <p className="text-sm text-rose-600">{msg}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-pink-500 text-white py-3 font-semibold hover:bg-pink-600 disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create account"}
              </button>

              <p className="text-xs text-slate-500">
                After creating your account, we’ll ask a few basics (name, DOB, etc.).
              </p>
            </form>
          )}

          {tab === "confirm" && (
            <form onSubmit={doConfirm} className="space-y-4">
              <div>
                <label className="text-sm text-slate-600">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Confirmation code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:ring-2 ring-offset-1 ring-slate-900"
                  placeholder="123456"
                  inputMode="numeric"
                />
              </div>

              {msg && <p className="text-sm text-rose-600">{msg}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-pink-500 text-white py-3 font-semibold hover:bg-pink-600 disabled:opacity-50"
              >
                {busy ? "Confirming…" : "Confirm email"}
              </button>
            </form>
          )}

          <p className="mt-6 text-[11px] text-slate-500 text-center">
            By continuing you agree to JobCopilot’s Terms of Use and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
