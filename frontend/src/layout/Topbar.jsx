// src/layout/Topbar.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../lib/authStore";

export default function Topbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className="container h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold">JobCopilot</Link>

        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-slate-600">{user.email}</span>}
          {user && (
            <button
              onClick={signOut}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
