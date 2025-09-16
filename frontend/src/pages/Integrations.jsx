// src/pages/Integrations.jsx
import { useState } from "react";
import { startGmailAuth } from "../lib/api.js";

export default function Integrations() {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function connectGmail() {
    try {
      setError("");
      setLoading(true);
      const res = await startGmailAuth(); // { ok:true, url: "..." } (next part)
      if (res?.url) {
        window.location.href = res.url; // go to Google consent screen
      } else {
        setError("Could not get Google sign-in URL (backend not ready).");
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Integrations</h1>

      <div className="rounded-2xl border p-4 mb-6">
        <h2 className="text-lg font-semibold mb-1">Gmail (Auto-Import)</h2>
        <p className="text-sm text-gray-600 mb-3">
          Connect your Gmail so JobCopilot can auto-create cards when you get
          “application received” emails.
        </p>
        <button
          onClick={connectGmail}
          disabled={loading}
          className="px-4 py-2 rounded-xl border shadow-sm hover:shadow disabled:opacity-60"
        >
          {loading ? "Opening Google…" : "Connect Gmail"}
        </button>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="rounded-2xl border p-4 opacity-60">
        <h2 className="text-lg font-semibold mb-1">Outlook (Coming soon)</h2>
        <p className="text-sm text-gray-600">
          Outlook support will be added after Gmail MVP.
        </p>
      </div>
    </div>
  );
}
