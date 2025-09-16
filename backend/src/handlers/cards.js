// backend/src/handlers/cards.js
// Routes:
// GET    /cards
// POST   /cards
// PUT    /cards/{id}
// DELETE /cards/{id}
// GET    /cards/_debug  (diagnostic)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";

/* ---------------------- clients / config ---------------------- */

const TABLE = process.env.CARDS_TABLE;
const raw = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

/* -------------------------- helpers --------------------------- */

function res(status, body) {
  return {
    statusCode: status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,x-user-id,authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  };
}

function httpInfo(event) {
  const rc = event.requestContext || {};
  const http = rc.http || {};
  const method = (http.method || event.httpMethod || "GET").toUpperCase();
  const path = (event.rawPath || event.path || "/").toLowerCase();
  const qs =
    event.queryStringParameters && typeof event.queryStringParameters === "object"
      ? event.queryStringParameters
      : {};
  return { method, path, qs };
}

function userIdFrom(event) {
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  if (headers["x-user-id"]) return headers["x-user-id"];
  const claims =
    event.requestContext?.authorizer?.jwt?.claims ||
    event.requestContext?.authorizer?.claims ||
    {};
  return claims["sub"] || claims["cognito:username"] || claims["email"] || "anon-user";
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  }
}

/* --------------------------- handler -------------------------- */

export const handler = async (event) => {
  try {
    const { method, path, qs } = httpInfo(event);
    const uid = userIdFrom(event);

    // CORS preflight
    if (method === "OPTIONS") return res(204, {});

    // Debug route
    if (method === "GET" && path === "/cards/_debug") {
      return res(200, {
        ok: true,
        runtime: "nodejs20+esm",
        region: process.env.AWS_REGION,
        table: TABLE,
        received: { method, path, qs },
        env: { hasCardsTable: !!TABLE },
      });
    }

    if (!TABLE) {
      return res(500, { ok: false, error: "CARDS_TABLE env var is not set on this Lambda" });
    }

    // ------- GET /cards
    if (method === "GET" && path === "/cards") {
      const limit = Math.max(1, Math.min(1000, Number(qs.limit) || 500));
      let out;
      try {
        out = await ddb.send(
          new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "userId = :u",
            ExpressionAttributeValues: { ":u": uid },
            Limit: limit,
          })
        );
      } catch (e) {
        console.error("DDB query error", e);
        return res(500, { ok: false, error: e.message || "DynamoDB query failed" });
      }

      // Filter out settings rows
      const items = (out.Items || []).filter(
        (it) => !String(it.cardId || "").startsWith("SETTINGS#")
      );

      return res(200, { ok: true, items });
    }

    // ------- POST /cards
    if (method === "POST" && path === "/cards") {
      const b = parseBody(event);
      const now = new Date().toISOString();
      const cardId = b.cardId || newId();

      const tags = Array.isArray(b.tags)
        ? b.tags
        : typeof b.tags === "string"
        ? b.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const salary =
        b.salary === "" || b.salary == null
          ? null
          : Number.isFinite(Number(b.salary))
          ? Number(b.salary)
          : String(b.salary);

      const item = {
        userId: uid,
        cardId,
        title: String(b.title || "").trim(),
        company: b.company ?? "",
        location: b.location ?? "",
        link: b.link ?? "",
        status: String(b.status || "saved").toLowerCase(),
        dueDate: b.dueDate ?? "", // "Next follow-up" in UI
        notes: b.notes ?? "",
        tags,
        // contact
        contactName: b.contactName ?? "",
        contactEmail: b.contactEmail ?? "",
        contactPhone: b.contactPhone ?? "",
        // extra
        salary,
        referredBy: b.referredBy ?? "",
        source: b.source ?? "",
        // meta
        flagged: !!b.flagged,
        createdAt: b.createdAt || now,
        updatedAt: now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return res(200, { ok: true, ...item, cardId });
    }

    // ------- PUT /cards/{id}
    if (method === "PUT" && path.startsWith("/cards/")) {
      const id = decodeURIComponent(path.split("/")[2] || "");
      if (!id) return res(400, { ok: false, error: "Missing card id" });
      const b = parseBody(event);

      const allowed = [
        "title",
        "company",
        "location",
        "link",
        "status",
        "dueDate",
        "notes",
        "tags",
        "contactName",
        "contactEmail",
        "contactPhone",
        "flagged",
        "salary",
        "referredBy",
        "source",
      ];

      const set = [];
      const names = { "#updatedAt": "updatedAt" };
      const values = { ":updatedAt": new Date().toISOString() };

      for (const k of allowed) {
        if (k in b) {
          names["#" + k] = k;
          if (k === "salary") {
            values[":" + k] =
              b.salary === "" || b.salary == null
                ? null
                : Number.isFinite(Number(b.salary))
                ? Number(b.salary)
                : String(b.salary);
          } else if (k === "tags" && typeof b[k] === "string") {
            values[":" + k] = b[k]
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          } else {
            values[":" + k] = b[k];
          }
          set.push("#" + k + " = :" + k);
        }
      }
      set.push("#updatedAt = :updatedAt");

      if (set.length === 1) return res(200, { ok: true, cardId: id }); // only updatedAt

      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId: uid, cardId: id },
          UpdateExpression: "SET " + set.join(", "),
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        })
      );

      return res(200, { ok: true, cardId: id });
    }

    // ------- DELETE /cards/{id}
    if (method === "DELETE" && path.startsWith("/cards/")) {
      const id = decodeURIComponent(path.split("/")[2] || "");
      if (!id) return res(400, { ok: false, error: "Missing card id" });

      await ddb.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { userId: uid, cardId: id },
        })
      );

      return res(200, { ok: true, cardId: id });
    }

    return res(404, { ok: false, error: "Not found" });
  } catch (e) {
    console.error("cards handler fatal error", e);
    return res(500, { ok: false, error: e.message || "Server error" });
  }
};
