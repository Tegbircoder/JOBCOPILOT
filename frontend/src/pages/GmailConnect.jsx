import { useEffect, useState } from "react";
import {
  initTokenClient, requestToken, revokeToken,
  hasToken, fetchUserInfo, findJobConfirmations
} from "../lib/gmail";

export default function GmailConnect() {
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(hasToken());
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    // Wait for GIS script to load
    let t = setInterval(() => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        clearInterval(t);
        initTokenClient();
        setReady(true);
      }
    }, 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Whenever a token arrives, update UI
    window.__onGmailToken = async () => {
      setConnected(true);
      setErr("");
      try {
        const u = await fetchUserInfo();
        setMe(u);
      } catch (e) {
        console.error(e);
        setErr(e.message);
      }
    };
  }, []);

  async function connect() {
    setErr("");
    requestToken(); // will trigger popup
  }

  function disconnect() {
    revokeToken();
    setConnected(false);
    setMe(null);
    setRows([]);
  }

  async function scan() {
    setLoading(true); setErr("");
    try {
      const items = await findJobConfirmations(30, 10);
      setRows(items);
    } catch (e) {
      setErr(e.message || "Failed to scan Gmail");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">Connect Gmail (dev)</h1>

      {!ready && <div>Loading Google Identity…</div>}

      {ready && !connected && (
        <button
          onClick={connect}
          className="rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
        >
          Connect Gmail
        </button>
      )}

      {connected && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={disconnect}
              className="rounded bg-rose-600 text-white px-3 py-2 hover:bg-rose-700"
            >
              Disconnect
            </button>
            <button
              onClick={scan}
              className="rounded bg-emerald-600 text-white px-3 py-2 hover:bg-emerald-700"
            >
              Find job confirmation emails
            </button>
          </div>

          {me && (
            <div className="text-sm text-slate-600">
              Connected as: <b>{me.email}</b>
            </div>
          )}

          {err && <div className="text-red-600">{err}</div>}

          <div className="mt-4 rounded border bg-white">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Subject</th>
                  <th className="px-3 py-2 text-left">From</th>
                  <th className="px-3 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={3} className="px-3 py-6">Scanning…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-slate-500">No matches yet</td></tr>
                )}
                {rows.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.subject || "—"}</td>
                    <td className="px-3 py-2">{r.from || "—"}</td>
                    <td className="px-3 py-2">{r.date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
