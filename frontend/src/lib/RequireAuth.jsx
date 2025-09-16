// src/lib/RequireAuth.jsx
import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./../lib/authStore";

function Loading() {
  return (
    <div className="min-h-[40vh] grid place-items-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        <div className="text-sm text-slate-600">Checking your session…</div>
      </div>
    </div>
  );
}

export default function RequireAuth({ children }) {
  const { ready, user, bootstrap } = useAuth();

  // Ensure we parse Hosted UI callback / restore session.
  useEffect(() => {
    if (!ready) bootstrap();
  }, [ready, bootstrap]);

  if (!ready) return <Loading />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
