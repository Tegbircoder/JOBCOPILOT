// Upcoming reminders (dueDate within N days), optional status filter
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

/* ---------- DDB client ---------- */
const TABLE = process.env.CARDS_TABLE || "jobcopilot-cards";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

/* ---------- helpers ---------- */
const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,x-user-id,authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};
const ok  = (b, s = 200) => ({ statusCode: s, headers: CORS, body: JSON.stringify(b) });
const bad = (s, m) => ok({ ok: false, error: m }, s);

function isHttpApiV2(e) { return !!e?.requestContext?.http; }
function getMethod(e) { return (isHttpApiV2(e) ? e.requestContext.http.method : e.httpMethod || "GET").toUpperCase(); }
function getHeader(e, name) {
  const h = e.headers || {};
  const k = Object.keys(h).find(k => k.toLowerCase() === name.toLowerCase());
  return k ? h[k] : null;
}

function resolveUserId(event) {
  const dev = getHeader(event, "x-user-id");
  if (dev) return String(dev);
  const claims =
    event?.requestContext?.authorizer?.jwt?.claims ||
    event?.requestContext?.authorizer?.claims ||
    null;
  if (claims) {
    return claims["sub"] || claims["cognito:username"] || claims["email"] || null;
  }
  return null;
}

function startOfUTC(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/* ---------- handler ---------- */
export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return ok({});
  try {
    if (!TABLE) return bad(500, "CARDS_TABLE not set");
    const userId = resolveUserId(event);
    if (!userId) return bad(401, "Unauthorized: missing user identity");

    const p = event.queryStringParameters || {};
    const days = Math.max(1, Number(p.days) || 14);
    const wantStatus = (p.status || "").trim(); // optional CSV list

    const today = startOfUTC(new Date());
    const end = new Date(today);
    end.setUTCDate(end.getUTCDate() + days);

    let items = [];
    try {
      const q = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId }
      }));
      items = q.Items || [];
    } catch {
      // fallback (should rarely be needed)
      const s = await ddb.send(new ScanCommand({ TableName: TABLE }));
      items = (s.Items || []).filter(i => i.userId === userId);
    }

    // ignore settings rows
    items = items.filter(i => !String(i.cardId || "").startsWith("SETTINGS#"));

    const statuses = wantStatus
      ? wantStatus.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
      : null;

    const within = items.filter(c => {
      const dd = c.dueDate;
      if (!dd) return false;

      // Accept "YYYY-MM-DD" or any ISO date/time string
      const t = Date.parse(dd.length === 10 ? `${dd}T00:00:00Z` : dd);
      if (Number.isNaN(t)) return false;

      if (statuses && !statuses.includes(String(c.status || "").toLowerCase())) return false;
      return t >= today.getTime() && t <= end.getTime();
    });

    within.sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));

    return ok({ ok: true, count: within.length, items: within });
  } catch (e) {
    console.error("reminder handler error:", e);
    return bad(500, "Server error");
  }
};
