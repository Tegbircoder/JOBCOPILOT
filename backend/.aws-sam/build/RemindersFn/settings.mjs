// Node 20 ESM
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.CARDS_TABLE || process.env.CARDS_TABLE_NAME;
const STAGES_SK = "SETTINGS#STAGES";
const ALLOW_DEV =
  process.env.ALLOW_DEV_HEADER === "1" ||
  String(process.env.ALLOW_DEV_HEADER || "").toLowerCase() === "true";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization,Content-Type,x-user-id,X-User-Id",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  };
}
const ok = (body, status = 200) => ({ statusCode: status, headers: cors(), body: JSON.stringify(body) });
const err = (status, message) => ok({ ok: false, message }, status);

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
  { key: "saved", name: "Saved" },
  { key: "applied", name: "Applied" },
  { key: "screening", name: "Screening" },
  { key: "final", name: "Final" },
  { key: "closed", name: "Closed" },
];

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || "GET";
  if (method === "OPTIONS") return ok({ ok: true });

  const userId = getUserId(event);
  if (!userId) return err(401, "Unauthorized");

  if (method === "GET") {
    const res = await ddb.send(
      new GetCommand({ TableName: TABLE, Key: { userId, cardId: STAGES_SK } })
    );
    const stages = res?.Item?.stages || DEFAULT_STAGES;
    return ok({ ok: true, stages });
  }

  if (method === "PUT") {
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return err(400, "Invalid JSON");
    }
    let stages = Array.isArray(payload?.stages) ? payload.stages : [];

    stages = stages
      .map((s) => ({
        key: String(s.key || "").toLowerCase().trim(),
        name: String(s.name || "").trim(),
      }))
      .filter((s) => s.key && s.name);

    if (stages.length === 0) stages = DEFAULT_STAGES;

    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: { userId, cardId: STAGES_SK, stages, updatedAt: new Date().toISOString() },
      })
    );

    return ok({ ok: true, stages });
  }

  return err(405, "Method not allowed");
};
