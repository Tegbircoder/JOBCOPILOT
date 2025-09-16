// Totals by status/company/title/location/tag with optional filters
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
  if (claims) return claims["sub"] || claims["cognito:username"] || claims["email"] || null;
  return null;
}

function pass(item, p) {
  const q = (p.q || "").trim().toLowerCase();
  if (q) {
    const hay = [
      item.title || "",
      item.company || "",
      item.location || "",
      Array.isArray(item.tags) ? item.tags.join(" ") : ""
    ].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }

  const want = (k) => String(p[k] || "").toLowerCase();
  const eq   = (a,b) => String(a||"").toLowerCase() === String(b||"").toLowerCase();

  if (want("status")   && !eq(item.status,   want("status")))   return false;
  if (want("company")  && !eq(item.company,  want("company")))  return false;
  if (want("title")    && !eq(item.title,    want("title")))    return false;
  if (want("location") && !eq(item.location, want("location"))) return false;

  if (want("tag")) {
    const tags = Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : [];
    if (!tags.includes(want("tag"))) return false;
  }
  return true;
}

const bump = (m, k) => { k = k || "—"; m[k] = (m[k] || 0) + 1; };

/* ---------- handler ---------- */
export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return ok({});
  try {
    if (!TABLE) return bad(500, "CARDS_TABLE not set");
    const userId = resolveUserId(event);
    if (!userId) return bad(401, "Unauthorized: missing user identity");

    const p = event.queryStringParameters || {};

    let items = [];
    try {
      const q = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId }
      }));
      items = q.Items || [];
    } catch {
      const s = await ddb.send(new ScanCommand({ TableName: TABLE }));
      items = (s.Items || []).filter(i => i.userId === userId);
    }

    // ignore settings rows
    items = items.filter(i => !String(i.cardId || "").startsWith("SETTINGS#"));

    const filtered = items.filter(i => pass(i, p));

    const byStatus = {}, byCompany = {}, byTitle = {}, byLocation = {}, byTag = {};
    for (const it of filtered) {
      bump(byStatus,   it.status);
      bump(byCompany,  it.company);
      bump(byTitle,    it.title);
      bump(byLocation, it.location);
      if (Array.isArray(it.tags)) for (const t of it.tags) bump(byTag, t);
    }

    return ok({ ok: true, count: filtered.length, totals: { byStatus, byCompany, byTitle, byLocation, byTag } });
  } catch (e) {
    console.error("stats handler error:", e);
    return bad(500, "Server error");
  }
};
