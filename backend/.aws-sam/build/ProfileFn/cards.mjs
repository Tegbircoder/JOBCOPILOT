// backend/src/handlers/cards.mjs
// Node.js 20 ESM
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.CARDS_TABLE;
const ALLOW_DEV =
  process.env.ALLOW_DEV_HEADER === "1" ||
  String(process.env.ALLOW_DEV_HEADER || "").toLowerCase() === "true";

const cors = () => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,x-user-id,X-User-Id",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
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

export const handler = async (event) => {
  // CORS preflight
  if (event?.requestContext?.http?.method === "OPTIONS") return ok({ ok: true });

  const userId = getUserId(event);
  if (!userId) return err(401, "Unauthorized");

  const { method, path } = event.requestContext.http;

  // GET /cards
  if (method === "GET" && path.endsWith("/cards")) {
    const limit = Math.min(Number(event.queryStringParameters?.limit || 500), 500);
    const startKey = event.queryStringParameters?.nextKey
      ? JSON.parse(Buffer.from(event.queryStringParameters.nextKey, "base64").toString())
      : undefined;

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId },
        Limit: limit,
        ExclusiveStartKey: startKey,
      })
    );

    return ok({
      ok: true,
      items: res.Items || [],
      nextKey: res.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString("base64")
        : null,
    });
  }

  // POST /cards
  if (method === "POST" && path.endsWith("/cards")) {
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return err(400, "Invalid JSON");
    }

    const now = new Date().toISOString();
    const item = {
      userId,
      cardId: payload.cardId || randomUUID(),
      title: payload.title || "",
      company: payload.company || "",
      location: payload.location || "",
      status: payload.status || payload.stage || "saved", // UI may send status or stage
      tags: payload.tags || [],
      dueDate: payload.dueDate || null,
      notes: payload.notes || "",
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    return ok({ ok: true, card: item }, 201);
  }

  // PUT /cards/{cardId}
  if (method === "PUT" && path.match(/\/cards\/[^/]+$/)) {
    const cardId = event.pathParameters?.cardId;
    if (!cardId) return err(400, "Missing cardId");

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return err(400, "Invalid JSON");
    }

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE, Key: { userId, cardId } })
    );

    const base = existing.Item || { userId, cardId, createdAt: new Date().toISOString() };
    const merged = {
      ...base,
      ...payload,
      status: payload.status || payload.stage || base.status || "saved",
      userId,
      cardId,
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: merged }));
    return ok({ ok: true, card: merged });
  }

  // DELETE /cards/{cardId}
  if (method === "DELETE" && path.match(/\/cards\/[^/]+$/)) {
    const cardId = event.pathParameters?.cardId;
    if (!cardId) return err(400, "Missing cardId");
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { userId, cardId } }));
    return ok({ ok: true });
  }

  // GET /cards/_debug (optional)
  if (method === "GET" && path.endsWith("/cards/_debug")) {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId },
        Limit: 1,
      })
    );
    return ok({ ok: true, sample: res.Items?.[0] || null });
  }

  return err(405, "Method not allowed");
};
