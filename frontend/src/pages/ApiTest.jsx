// src/pages/ApiTest.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listCards, createCard, updateCard, deleteCard,
  getStats, isApiEnabled
} from "../lib/api";
import cfg from "../lib/cfg";

function sortCounts(obj = {}) {
  return Object.entries(obj)
    .map(([k, v]) => ({ k, v }))
    .sort((a, b) => b.v - a.v || a.k.localeCompare(b.k));
}

export default function ApiTest() {
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  async function refresh() {
    try {
      setLoading(true);
      setError("");
      const res = await listCards();
      const items = Array.isArray(res) ? res : res?.items ?? [];
      setCards(items);
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      setLoading(true);
      await createCard({ title: "API Test Card", company: "JobCopilot", status: "Saved" });
      await refresh();
    } catch (e) {
      setError(e.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(card) {
    try {
      setLoading(true);
      await updateCard(card.cardId, { status: "Applied" });
      await refresh();
    } catch (e) {
      setError(e.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(card) {
    try {
      setLoading(true);
      await deleteCard(card.cardId);
      await refresh();
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchStats() {
    try {
      setLoading(true);
      setError("");
      const s = await getStats();
      setStats(s);
    } catch (e) {
      setError(e.message || "Stats failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isApiEnabled) refresh();
  }, []);

  const byStatus   = useMemo(() => sortCounts(stats?.totals?.byStatus),   [stats]);
  const byCompany  = useMemo(() => sortCounts(stats?.totals?.byCompany),  [stats]);
  const byTitle    = useMemo(() => sortCounts(stats?.totals?.byTitle),    [stats]);
  const byLocation = useMemo(() => sortCounts(stats?.totals?.byLocation), [stats]);
  const byTag      = useMemo(() => sortCounts(stats?.totals?.byTag),      [stats]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API Test</h1>

      {!isApiEnabled && (
        <div className="text-red-600">
          API is not configured. Set <code>VITE_API_URL</code>.
        </div>
      )}

      <div className="text-sm text-gray-600">
        <div><b>API_URL:</b> {cfg.API_URL || "(not set)"} </div>
        <div><b>DEV_USER_ID (x-user-id):</b> {cfg.DEV_USER_ID}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={refresh} className="px-3 py-2 rounded bg-slate-200 hover:bg-slate-300">
          Refresh cards
        </button>
        <button onClick={handleCreate} className="px-3 py-2 rounded bg-emerald-500 text-white hover:bg-emerald-600">
          Create test card
        </button>
        <button onClick={handleFetchStats} className="px-3 py-2 rounded bg-indigo-500 text-white hover:bg-indigo-600">
          Fetch stats
        </button>
      </div>

      {loading && <div className="text-blue-600">Loading…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {/* Cards list */}
      <div className="space-y-2">
        <h2 className="font-semibold">Cards</h2>
        {cards.map((c) => (
          <div key={c.cardId} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">
                {c.title} <span className="text-xs text-gray-500">({c.cardId})</span>
              </div>
              <div className="text-sm text-gray-600">{c.company} • {c.status}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleUpdate(c)} className="px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600">
                Mark Applied
              </button>
              <button onClick={() => handleDelete(c)} className="px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700">
                Delete
              </button>
            </div>
          </div>
        ))}
        {cards.length === 0 && !loading && <div className="text-gray-500">No cards yet.</div>}
      </div>
    </div>
  );
}
