import { useEffect, useState } from "react";
import { getReminders } from "../api/client";

export default function RemindersList() {
  const [data, setData] = useState({ items: [], count: 0, ok: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReminders({ days: 30 })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;

  return (
    <div>
      <h2>Upcoming reminders (next 30 days)</h2>
      <p>Total: {data.count}</p>
      <ul>
        {data.items.map(i => (
          <li key={i.cardId}>
            <strong>{i.title || "(no title)"}</strong> — {i.company || "—"} — due {i.dueDate || "n/a"}
          </li>
        ))}
      </ul>
    </div>
  );
}
