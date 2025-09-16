// Node 20 ESM
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.CARDS_TABLE || process.env.CARDS_TABLE_NAME;
const ALLOW_DEV =
  process.env.ALLOW_DEV_HEADER === "1" ||
  String(process.env.ALLOW_DEV_HEADER || "").toLowerCase() === "true";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization,Content-Type,x-user-id,X-User-Id",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
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

function toDateOnly(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(+d)) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || "GET";
  if (method === "OPTIONS") return ok({ ok: true });

  const userId = getUserId(event);
  if (!userId) return err(401, "Unauthorized");

  const sp = new URLSearchParams(event?.rawQueryString || "");
  const days = Math.max(1, Math.min(60, Number(sp.get("days")) || 7));

  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "#u = :u",
      ExpressionAttributeNames: { "#u": "userId" },
      ExpressionAttributeValues: { ":u": userId },
    })
  );

  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + days);

  const due = [];
  for (const it of res.Items || []) {
    if (!it?.dueDate) continue;
    const d = new Date(it.dueDate);
    if (Number.isNaN(+d)) continue;
    if (d >= today && d <= end) {
      due.push({
        cardId: it.cardId,
        title: it.title || it.position || "(no title)",
        company: it.company || "",
        stage: it.stage || "",
        dueDate: toDateOnly(it.dueDate),
      });
    }
  }

  due.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  return ok({ ok: true, upcoming: due });
};
