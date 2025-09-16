// backend/scripts/migrate_to_pksk.js
import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";

const REGION = process.env.AWS_REGION || "ca-central-1";

// 🔧 set these to your actual table names shown in CloudFormation Outputs
const OLD_TABLE = process.env.OLD_TABLE || "jobcopilot-backend-CardsTable-XXXX"; // userId/cardId table
const NEW_TABLE = process.env.NEW_TABLE || "jobcopilot-backend-CardsTableV2-YYYY"; // PK/SK table

const ddb = new DynamoDBClient({ region: REGION });

function toAttr(v) {
  if (v === null || v === undefined) return { NULL: true };
  if (Array.isArray(v)) return { L: v.map(toAttr) };
  switch (typeof v) {
    case "string": return { S: v };
    case "number": return { N: String(v) };
    case "boolean": return { BOOL: v };
    case "object":
      return {
        M: Object.fromEntries(Object.entries(v).map(([k, vv]) => [k, toAttr(vv)])),
      };
    default:
      return { S: String(v) };
  }
}

function pkFor(sub) { return `USER#${sub}`; }
function skFor(id)  { return `CARD#${id}`; }

async function scanAll() {
  let items = [];
  let ExclusiveStartKey;
  do {
    const out = await ddb.send(
      new ScanCommand({ TableName: OLD_TABLE, ExclusiveStartKey })
    );
    items = items.concat(out.Items || []);
    ExclusiveStartKey = out.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function batchWrite(puts) {
  while (puts.length) {
    const chunk = puts.splice(0, 25); // batch write max 25
    const req = {
      RequestItems: {
        [NEW_TABLE]: chunk.map((Item) => ({ PutRequest: { Item } })),
      },
    };
    await ddb.send(new BatchWriteItemCommand(req));
  }
}

function fromAttr(item) {
  // very small "unmarshal" for the fields we use
  const getS = (k) => item[k]?.S || null;
  const getL = (k) => (item[k]?.L || []).map((x) => x.S ?? null).filter(Boolean);

  return {
    userId: getS("userId"),
    cardId: getS("cardId"),
    title: getS("title") || "Untitled",
    company: getS("company") || "",
    location: getS("location") || "",
    status: getS("status") || "Saved",
    dueDate: item.dueDate?.S ?? null,
    tags: getL("tags"),
    notes: getS("notes") || "",
    createdAt: getS("createdAt") || new Date().toISOString(),
    updatedAt: getS("updatedAt") || new Date().toISOString(),
  };
}

async function main() {
  if (!OLD_TABLE || !NEW_TABLE) {
    console.error("Set OLD_TABLE and NEW_TABLE environment variables.");
    process.exit(1);
  }
  console.log("Scanning", OLD_TABLE, "…");
  const oldItems = await scanAll();
  console.log("Found", oldItems.length, "items. Migrating…");

  const puts = [];
  for (const it of oldItems) {
    const c = fromAttr(it);
    const row = {
      PK: toAttr(pkFor(c.userId)),
      SK: toAttr(skFor(c.cardId)),
      userId: toAttr(c.userId),
      cardId: toAttr(c.cardId),
      title: toAttr(c.title),
      company: toAttr(c.company),
      location: toAttr(c.location),
      status: toAttr(c.status),
      dueDate: c.dueDate ? toAttr(c.dueDate) : { NULL: true },
      tags: toAttr(c.tags || []),
      notes: toAttr(c.notes || ""),
      createdAt: toAttr(c.createdAt),
      updatedAt: toAttr(c.updatedAt),
    };
    puts.push(row);
  }

  await batchWrite(puts);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
