// Simple health endpoint (ESM + Node 20)
export const handler = async () => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,x-user-id,authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  },
  body: JSON.stringify({
    ok: true,
    service: "JobCopilot API",
    runtime: "nodejs20",
    ts: new Date().toISOString(),
  }),
});
