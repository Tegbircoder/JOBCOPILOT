// backend/src/handlers/stages.mjs
// Node.js 20 ESM
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.STAGES_TABLE; // PK: userId
const ALLOW_DEV =
  process.env.ALLOW_DEV_HEADER === "1" ||
  String(process.env.ALLOW_DEV_HEADER || "").toLowerCase() === "true";

const cors = () => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,x-user-id,X-User-Id",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
});
const ok  = (b, s = 200) => ({ statusCode: s, headers: cors(), body: JSON.stringify(b) });
const err = (s, m)      => ok({ ok: false, message: m }, s);

function getHeaderCI(event, name) {
  const h = event?.headers || {};
  const k = Object.keys(h).find((x) => x.toLowerCase() === name.toLowerCase());
  return k ? h[k] : undefined;
}
function getUserId(event) {
  const sub = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (sub) return sub;
  const dev = getHeaderCI(event, "x-user-id");
  if (ALLOW_DEV && dev) return dev;
  return null;
}

const DEFAULT_STAGES = [
  { key: "saved",     name: "SAVED",     limit: null },
  { key: "applied",   name: "APPLIED",   limit: null },
  { key: "screening", name: "SCREENING", limit: null },
  { key: "final",     name: "FINAL",     limit: null },
  { key: "closed",    name: "CLOSED",    limit: null },
];

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || "GET";
  if (method === "OPTIONS") return ok({ ok: true });

  const userId = getUserId(event);
  if (!userId) return err(401, "Unauthorized: missing user identity");

  if (method === "GET") {
    const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { userId } }));
    const stages = res.Item?.stages || DEFAULT_STAGES;
    return ok({ ok: true, stages });
  }

  if (method === "PUT") {
    let payload = {};
    try { payload = JSON.parse(event.body || "{}"); }
    catch { return err(400, "Invalid JSON"); }

    const stages = Array.isArray(payload.stages) ? payload.stages : DEFAULT_STAGES;
    const item = { userId, stages, updatedAt: new Date().toISOString() };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    return ok({ ok: true, stages });
  }

  return err(405, "Method not allowed");
};
