// src/App.jsx
import { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import Layout from "./layout/Layout";
import RequireAuth from "./lib/RequireAuth";
import RequireProfile from "./lib/RequireProfile";

/* -------- Lazy-loaded pages (code-splitting) -------- */
const Home          = lazy(() => import("./pages/Home"));
const Board         = lazy(() => import("./pages/Board"));
const Summary       = lazy(() => import("./pages/Summary"));
const List          = lazy(() => import("./pages/List"));
const Reminders     = lazy(() => import("./pages/Reminders"));
const Networking    = lazy(() => import("./pages/Networking"));
const Dashboard     = lazy(() => import("./pages/Dashboard"));
const StageSettings = lazy(() => import("./pages/StageSettings"));
const Login         = lazy(() => import("./pages/Login"));
const Onboarding    = lazy(() => import("./pages/Onboarding"));
const ApiTest       = lazy(() => import("./pages/ApiTest"));
const AuthCallback  = lazy(() => import("./pages/AuthCallback")); // hosted UI callback
const Settings      = lazy(() => import("./pages/Settings"));     // NEW

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

function ProtectedShell() {
  return (
    <RequireAuth>
      <RequireProfile>
        <Outlet />
      </RequireProfile>
    </RequireAuth>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        <div className="text-sm text-slate-600">Loading JobCopilot…</div>
      </div>
    </div>
  );
}

export default function App() {
  const basename = import.meta.env?.BASE_URL || "/";

  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Cognito Hosted UI callback */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* App shell */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="api-test" element={<ApiTest />} />

            {/* Onboarding (auth only) */}
            <Route
              path="onboarding"
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              }
            />

            {/* Protected areas */}
            <Route element={<ProtectedShell />}>
              <Route path="board" element={<Board />} />
              <Route path="board/summary" element={<Summary />} />
              <Route path="board/list" element={<List />} />
              <Route path="board/reminders" element={<Reminders />} />
              <Route path="board/settings" element={<StageSettings />} />

              {/* NEW: user profile settings */}
              <Route path="settings" element={<Settings />} />

              <Route path="networking" element={<Networking />} />
              <Route path="dashboard" element={<Dashboard />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
