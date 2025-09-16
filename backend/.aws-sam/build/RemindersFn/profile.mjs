// backend/src/handlers/profile.mjs
// Node.js 20 + ESM

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.PROFILES_TABLE;

// Optional dev bypass (header x-user-id) — set env ALLOW_DEV_HEADER=1 to enable
const ALLOW_DEV =
  process.env.ALLOW_DEV_HEADER === "1" ||
  String(process.env.ALLOW_DEV_HEADER || "").toLowerCase() === "true";

// ---------- common helpers ----------
function cors() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Authorization,Content-Type,X-User-Id,x-user-id",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  };
}
const ok = (body, status = 200) => ({
  statusCode: status,
  headers: cors(),
  body: JSON.stringify(body),
});
const err = (status, messageOrErrors) => {
  const body = Array.isArray(messageOrErrors)
    ? { ok: false, errors: messageOrErrors }
    : { ok: false, message: messageOrErrors || "Error" };
  return ok(body, status);
};

function getUserId(event) {
  // Prefer Cognito JWT `sub`
  const sub = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (sub) return sub;
  // Dev fallback header
  const hdr = event?.headers?.["x-user-id"] || event?.headers?.["X-User-Id"];
  if (ALLOW_DEV && hdr) return hdr;
  return null;
}
function getTokenEmail(event) {
  const e = event?.requestContext?.authorizer?.jwt?.claims?.email;
  return typeof e === "string" ? e : null;
}

// ---------- validation helpers ----------
const ALLOWED_GENDERS = new Set([
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
]);
const ALLOWED_ROLES = new Set(["student", "tutor"]);
const ALLOWED_BACKGROUND = new Set(["student", "experienced"]);

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isIsoDateYYYYMMDD(s) {
  if (typeof s !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = s.split("-").map((x) => parseInt(x, 10));
  return (
    d.getUTCFullYear() === y &&
    d.getUTCMonth() + 1 === m &&
    d.getUTCDate() === day
  );
}
function ageFromDOB(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map((x) => parseInt(x, 10));
  const dob = new Date(Date.UTC(y, m - 1, d));
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const mo = now.getUTCMonth() - dob.getUTCMonth();
  if (mo < 0 || (mo === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

// normalize keys (case-insensitive) and drop empty strings
function pickAndNormalize(raw) {
  const lower = {};
  for (const [k, v] of Object.entries(raw || {})) {
    lower[String(k).toLowerCase()] = typeof v === "string" ? v.trim() : v;
  }
  const out = {
    fullName: lower.fullname ?? lower["full_name"] ?? lower["full-name"],
    email: lower.email,
    dob: lower.dob,
    gender: lower.gender,
    country: lower.country,
    city: lower.city,
    role: lower.role,
    backgroundType:
      lower.backgroundtype ?? lower["background_type"] ?? lower["background-type"],
    universityName:
      lower.universityname ?? lower["university_name"] ?? lower["university-name"],
    jobExperience:
      lower.jobexperience ?? lower["job_experience"] ?? lower["job-experience"],
  };
  for (const k of Object.keys(out)) {
    if (typeof out[k] === "string" && out[k].length === 0) delete out[k];
  }
  return out;
}

function validateOnCreate(candidate, tokenEmail) {
  const errors = [];

  // Required on first save
  const required = [
    "fullName",
    "email",
    "dob",
    "gender",
    "country",
    "city",
    "role",
    "backgroundType",
  ];
  for (const f of required) {
    if (!candidate[f] && !(f === "email" && tokenEmail)) {
      errors.push({ field: f, message: "This field is required." });
    }
  }

  // email (token overrides payload if present)
  if (candidate.email || tokenEmail) {
    const em = tokenEmail || candidate.email;
    if (!emailRe.test(em)) {
      errors.push({ field: "email", message: "Email is not valid." });
    }
  }

  // dob
  if (candidate.dob) {
    if (!isIsoDateYYYYMMDD(candidate.dob)) {
      errors.push({
        field: "dob",
        message: "Must be in YYYY-MM-DD format and be a real date.",
      });
    } else {
      const age = ageFromDOB(candidate.dob);
      if (age < 13 || age > 120) {
        errors.push({ field: "dob", message: "Age must be between 13 and 120." });
      }
    }
  }

  // enums
  if (candidate.gender && !ALLOWED_GENDERS.has(candidate.gender)) {
    errors.push({
      field: "gender",
      message: "Must be one of: Male, Female, Other, Prefer not to say.",
    });
  }
  if (candidate.role && !ALLOWED_ROLES.has(candidate.role)) {
    errors.push({ field: "role", message: "Must be 'student' or 'tutor'." });
  }
  if (
    candidate.backgroundType &&
    !ALLOWED_BACKGROUND.has(candidate.backgroundType)
  ) {
    errors.push({
      field: "backgroundType",
      message: "Must be 'student' or 'experienced'.",
    });
  }

  // cross-field rules
  if (candidate.backgroundType === "student") {
    if (!candidate.universityName) {
      errors.push({
        field: "universityName",
        message: "Required when backgroundType = student.",
      });
    }
    if (candidate.jobExperience) {
      errors.push({
        field: "jobExperience",
        message: "Should be empty when backgroundType = student.",
      });
    }
  } else if (candidate.backgroundType === "experienced") {
    if (!candidate.jobExperience) {
      errors.push({
        field: "jobExperience",
        message: "Required when backgroundType = experienced.",
      });
    }
    if (candidate.universityName) {
      errors.push({
        field: "universityName",
        message: "Should be empty when backgroundType = experienced.",
      });
    }
  }

  // lengths
  const len = (s) => (typeof s === "string" ? s.length : 0);
  if (len(candidate.fullName) < 2 || len(candidate.fullName) > 80) {
    errors.push({ field: "fullName", message: "Must be 2–80 characters." });
  }
  for (const f of ["country", "city"]) {
    if (candidate[f] && (len(candidate[f]) < 2 || len(candidate[f]) > 80)) {
      errors.push({ field: f, message: "Must be 2–80 characters." });
    }
  }
  if (candidate.universityName && len(candidate.universityName) > 120) {
    errors.push({ field: "universityName", message: "Too long (max 120)." });
  }
  if (candidate.jobExperience && len(candidate.jobExperience) > 200) {
    errors.push({ field: "jobExperience", message: "Too long (max 200)." });
  }

  return errors;
}

function validateOnUpdate(patch, existing) {
  const errors = [];

  // background rules (use candidate value or existing if not provided)
  const bg = patch.backgroundType ?? existing?.backgroundType;
  if (bg === "student") {
    const uni = patch.universityName ?? existing?.universityName;
    if (!uni) {
      errors.push({
        field: "universityName",
        message: "Required when backgroundType = student.",
      });
    }
    if (patch.jobExperience) {
      errors.push({
        field: "jobExperience",
        message: "Should be empty when backgroundType = student.",
      });
    }
  } else if (bg === "experienced") {
    const job = patch.jobExperience ?? existing?.jobExperience;
    if (!job) {
      errors.push({
        field: "jobExperience",
        message: "Required when backgroundType = experienced.",
      });
    }
    if (patch.universityName) {
      errors.push({
        field: "universityName",
        message: "Should be empty when backgroundType = experienced.",
      });
    }
  }

  // basic fields if present
  if (patch.email && !emailRe.test(patch.email)) {
    errors.push({ field: "email", message: "Email is not valid." });
  }
  if (patch.dob) {
    if (!isIsoDateYYYYMMDD(patch.dob)) {
      errors.push({
        field: "dob",
        message: "Must be in YYYY-MM-DD format and be a real date.",
      });
    } else {
      const age = ageFromDOB(patch.dob);
      if (age < 13 || age > 120) {
        errors.push({ field: "dob", message: "Age must be between 13 and 120." });
      }
    }
  }
  if (patch.gender && !ALLOWED_GENDERS.has(patch.gender)) {
    errors.push({
      field: "gender",
      message: "Must be one of: Male, Female, Other, Prefer not to say.",
    });
  }
  if (patch.role && !ALLOWED_ROLES.has(patch.role)) {
    errors.push({ field: "role", message: "Must be 'student' or 'tutor'." });
  }
  if (patch.backgroundType && !ALLOWED_BACKGROUND.has(patch.backgroundType)) {
    errors.push({
      field: "backgroundType",
      message: "Must be 'student' or 'experienced'.",
    });
  }

  return errors;
}

// ---------- handler ----------
export const handler = async (event) => {
  // CORS preflight
  if (event?.requestContext?.http?.method === "OPTIONS") {
    return ok({ ok: true });
  }

  const method = event?.requestContext?.http?.method || "GET";
  const userId = getUserId(event);
  if (!userId) return err(401, "Unauthorized");

  if (method === "GET") {
    const res = await ddb.send(
      new GetCommand({ TableName: TABLE, Key: { userId } })
    );
    return ok({ ok: true, profile: res.Item || null });
  }

  if (method === "PUT") {
    // Parse
    let raw = {};
    try {
      raw = JSON.parse(event.body || "{}");
    } catch {
      return err(400, "Invalid JSON");
    }

    // Normalize & protect
    const patch = pickAndNormalize(raw);
    delete patch.userId; // never allow override

    // Load existing (if any)
    const existingRes = await ddb.send(
      new GetCommand({ TableName: TABLE, Key: { userId } })
    );
    const existing = existingRes.Item || null;

    // Validate
    const tokenEmail = getTokenEmail(event);
    const errors = existing
      ? validateOnUpdate(patch, existing)
      : validateOnCreate({ ...patch }, tokenEmail);
    if (errors.length) return err(400, errors);

    // Merge for save (partial update)
    const now = new Date().toISOString();
    const merged = {
      ...(existing || {}),
      ...patch,
      userId, // enforce real id
      email: tokenEmail || patch.email || existing?.email || null,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: merged }));
    return ok({ ok: true, profile: merged });
  }

  return err(405, "Method not allowed");
};
