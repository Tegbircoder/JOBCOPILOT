// GET/PUT board stages in the same DynamoDB table as cards
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

/* --------------------------- config / clients --------------------------- */
const TABLE = process.env.CARDS_TABLE;
if (!TABLE) console.warn("WARNING: CARDS_TABLE env var is not set");

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

/* ------------------------------- helpers -------------------------------- */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-user-id"
  };
}
function res(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
    body: JSON.stringify(body ?? {}),
  };
}
function isHttpApiV2(event) { return !!event?.requestContext?.http; }
function getMethod(event) { return (isHttpApiV2(event) ? event.requestContext.http.method : event.httpMethod || "GET").toUpperCase(); }
function getPath(event) { return isHttpApiV2(event) ? (event.requestContext.http.path || "/") : (event.path || "/"); }
function getHeader(event, name) {
  const h = event.headers || {};
  const key = Object.keys(h).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? h[key] : null;
}
function parseJson(body) { if (!body) return {}; try { return JSON.parse(body); } catch { return {}; } }
function resolveUserId(event) {
  const devHeader = getHeader(event, "x-user-id");
  if (devHeader) return String(devHeader);
  const claims = event?.requestContext?.authorizer?.jwt?.claims || event?.requestContext?.authorizer?.claims || null;
  if (claims) return claims["sub"] || claims["cognito:username"] || claims["email"] || null;
  return null;
}

/* ----------------------------- defaults --------------------------------- */
const DEFAULT_STAGES = [
  { key: "saved",     name: "Saved",     color: "bg-sky-50",     limit: null },
  { key: "applied",   name: "Applied",   color: "bg-emerald-50", limit: null },
  { key: "screening", name: "Screening", color: "bg-amber-50",   limit: null },
  { key: "final",     name: "Final",     color: "bg-violet-50",  limit: null },
  { key: "closed",    name: "Closed",    color: "bg-rose-50",    limit: null }
];

/* ----------------------------- validation -------------------------------- */
const KEY_REGEX = /^[a-z0-9-]+$/;
function validateStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) throw new Error("stages must be a non-empty array");
  const seen = new Set();
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i] || {};
    const key = String(s.key || "").trim().toLowerCase();
    const name = String(s.name || "").trim();
    const color = s.color == null ? null : String(s.color || "").trim();
    const limit =
      s.limit == null || s.limit === ""
        ? null
        : Number.isFinite(Number(s.limit)) && Number(s.limit) >= 1
        ? Math.floor(Number(s.limit))
        : NaN;

    if (!key) throw new Error(`Row ${i + 1}: key is required`);
    if (!KEY_REGEX.test(key)) throw new Error(`Row ${i + 1}: key must match ${KEY_REGEX}`);
    if (seen.has(key)) throw new Error(`Row ${i + 1}: duplicate key '${key}'`);
    seen.add(key);
    if (!name) throw new Error(`Row ${i + 1}: name is required`);
    if (!(limit === null || Number.isFinite(limit))) throw new Error(`Row ${i + 1}: limit must be empty or a number >= 1`);

    stages[i] = { key, name, color: color || null, limit: limit === null ? null : limit };
  }
  return stages;
}

/* ------------------------------- handler --------------------------------- */
export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return { statusCode: 204, headers: corsHeaders(), body: "" };

  const method = getMethod(event);
  const path = getPath(event) || "/";
  const userId = resolveUserId(event);

  if (!userId) return res(401, { ok: false, error: "Unauthorized: missing user identity" });
  if (!TABLE)  return res(500, { ok: false, error: "Server misconfig: CARDS_TABLE not set" });

  // PK = userId, SK = "SETTINGS#stages"
  const pk = String(userId);
  const sk = "SETTINGS#stages";

  try {
    if (method === "GET" && path.endsWith("/settings/stages")) {
      const out = await doc.send(new GetCommand({
        TableName: TABLE,
        Key: { userId: pk, cardId: sk },
        ConsistentRead: true
      }));

      if (out?.Item?.stages?.length) {
        return res(200, { ok: true, stages: out.Item.stages, updatedAt: out.Item.updatedAt });
      }
      return res(200, { ok: true, stages: DEFAULT_STAGES, defaulted: true });
    }

    if (method === "PUT" && path.endsWith("/settings/stages")) {
      const body = parseJson(event.body);
      try {
        const cleaned = validateStages(body?.stages);
        const put = { userId: pk, cardId: sk, stages: cleaned, updatedAt: new Date().toISOString() };
        await doc.send(new PutCommand({ TableName: TABLE, Item: put }));
        return res(200, { ok: true, saved: put.updatedAt });
      } catch (e) {
        return res(400, { ok: false, error: String(e.message || e) });
      }
    }

    return res(404, { ok: false, error: "Not found" });
  } catch (e) {
    console.error("settings handler error:", e);
    return res(500, { ok: false, error: "Internal Server Error" });
  }
};
