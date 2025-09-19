// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/authStore";
import { useProfile } from "../lib/profileStore";
import { isValidProfile } from "../lib/RequireProfile";
import { Mail, Lock, Eye, EyeOff, Sparkles, Zap, Shield } from "lucide-react";

/* ---------- UI bits ---------- */
function SocialButton({ icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-gradient-to-r from-white to-slate-50 px-6 py-4 text-slate-800 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 via-indigo-50/50 to-indigo-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10 flex items-center gap-3">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
    </button>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl px-6 py-3 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200"
          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
      }`}
    >
      {children}
      {active && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 animate-pulse"></div>
      )}
    </button>
  );
}

function InputField({ label, icon: Icon, type = "text", showPassword, onTogglePassword, ...props }) {
  return (
    <div className="group">
      <label className="text-sm font-medium text-slate-700 mb-2 block">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          <Icon size={18} />
        </div>
        <input
          type={type === "password" && showPassword ? "text" : type}
          className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-slate-200 bg-white/80 backdrop-blur-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-200 placeholder:text-slate-400"
          {...props}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
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

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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
        nav("/onboarding", { replace: true });
      }
    }
  }, [authReady, user, profileReady, profile, nav, loadProfile]);

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

  // Safe social wrappers (show "coming soon" if not wired)
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 grid place-items-center">
        <div className="text-center">
          <div className="relative">
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <div className="absolute inset-0 mx-auto h-12 w-12 animate-ping rounded-full bg-indigo-400 opacity-20" />
          </div>
          <div className="text-slate-600 font-medium">Checking your session...</div>
          <div className="text-sm text-slate-400 mt-2">Please wait a moment</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400 to-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-yellow-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-md px-4 py-8 min-h-screen flex flex-col justify-center">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              JobCopilot
            </h1>
          </div>
          <p className="text-slate-600">Your AI-powered career companion</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 relative">
          {/* Floating elements */}
          <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl opacity-20 rotate-12 animate-bounce"></div>
          <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-gradient-to-br from-pink-400 to-yellow-400 rounded-2xl opacity-20 -rotate-12 animate-bounce animation-delay-1000"></div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              Welcome {tab === "signin" ? "back" : tab === "signup" ? "aboard" : ""}
            </h2>
            <p className="text-slate-600">
              {tab === "signin" && "Sign in to continue your journey"}
              {tab === "signup" && "Create your account to get started"}
              {tab === "confirm" && "Verify your email address"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-3 mb-8 p-1 bg-slate-100 rounded-2xl">
            <TabButton active={tab === "signin"} onClick={() => setTab("signin")}>
              Sign in
            </TabButton>
            <TabButton active={tab === "signup"} onClick={() => setTab("signup")}>
              Sign up
            </TabButton>
            {tab === "confirm" && (
              <TabButton active={tab === "confirm"} onClick={() => setTab("confirm")}>
                Confirm
              </TabButton>
            )}
          </div>

          {/* Social buttons - only show for signin/signup */}
          {tab !== "confirm" && (
            <>
              <div className="space-y-3 mb-6">
                <SocialButton
                  label="Continue with Google"
                  onClick={safeSocial(signInWithGoogle, "Google")}
                  disabled={busy}
                  icon={
                    <div className="w-5 h-5 bg-gradient-to-br from-red-500 to-yellow-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">G</span>
                    </div>
                  }
                />
                <SocialButton
                  label="Continue with Facebook"
                  onClick={safeSocial(signInWithFacebook, "Facebook")}
                  disabled={busy}
                  icon={
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">f</span>
                    </div>
                  }
                />
                <SocialButton
                  label="Continue with LinkedIn"
                  onClick={safeSocial(signInWithLinkedIn, "LinkedIn")}
                  disabled={busy}
                  icon={
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">in</span>
                    </div>
                  }
                />
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-sm text-slate-500">or continue with email</span>
                </div>
              </div>
            </>
          )}

          {/* Forms */}
          {tab === "signin" && (
            <form onSubmit={doSignIn} className="space-y-6">
              <InputField
                label="Email address"
                type="email"
                icon={Mail}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              
              <InputField
                label="Password"
                type="password"
                icon={Lock}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />

              {msg && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <Shield size={16} />
                  {msg}
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                    defaultChecked
                  />
                  <span className="text-sm text-slate-700">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full relative rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 font-semibold hover:from-indigo-700 hover:to-purple-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {busy ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles size={18} />
                    Sign in
                  </div>
                )}
              </button>
            </form>
          )}

          {tab === "signup" && (
            <form onSubmit={doSignUp} className="space-y-6">
              <InputField
                label="Email address"
                type="email"
                icon={Mail}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              
              <InputField
                label="Password"
                type="password"
                icon={Lock}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />

              {msg && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <Shield size={16} />
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full relative rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 font-semibold hover:from-indigo-700 hover:to-purple-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {busy ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating account...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles size={18} />
                    Create account
                  </div>
                )}
              </button>

              <p className="text-xs text-slate-500 text-center leading-relaxed">
                By creating an account, you'll go through a quick onboarding to personalize your experience.
              </p>
            </form>
          )}

          {tab === "confirm" && (
            <form onSubmit={doConfirm} className="space-y-6">
              <InputField
                label="Email address"
                type="email"
                icon={Mail}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              
              <InputField
                label="Confirmation code"
                type="text"
                icon={Shield}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                inputMode="numeric"
              />

              {msg && (
                <div className={`p-4 rounded-2xl text-sm flex items-center gap-2 ${
                  msg.includes("confirmed") 
                    ? "bg-green-50 border border-green-200 text-green-700" 
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  <Shield size={16} />
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full relative rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 font-semibold hover:from-indigo-700 hover:to-purple-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {busy ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Confirming...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Shield size={18} />
                    Confirm email
                  </div>
                )}
              </button>
            </form>
          )}

          <p className="mt-8 text-xs text-slate-500 text-center leading-relaxed">
            By continuing you agree to JobCopilot's{" "}
            <a href="#" className="text-indigo-600 hover:underline">Terms of Use</a>
            {" "}and{" "}
            <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>.
          </p>
        </div>

        {/* Footer links */}
        <div className="text-center mt-6">
          {tab === "signin" ? (
            <p className="text-slate-600">
              Don't have an account?{" "}
              <button
                onClick={() => setTab("signup")}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Sign up
              </button>
            </p>
          ) : tab === "signup" ? (
            <p className="text-slate-600">
              Already have an account?{" "}
              <button
                onClick={() => setTab("signin")}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Sign in
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}