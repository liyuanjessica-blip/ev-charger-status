const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
 
async function redisGet(key) {
  const res = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const data = await res.json();
  if (!data.result) return null;
  const parsed = JSON.parse(data.result);
  // If chargers missing, treat as null so DEFAULT_STATE kicks in
  if (!parsed["CHG-001"]) return null;
  return parsed;
}
 
async function redisSet(key, value) {
  await fetch(`${REDIS_URL}/set/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ value: JSON.stringify(value) }),
  });
}
 
const DEFAULT_STATE = {
  "CHG-001": { status: "available", startTime: null, userName: null },
  "CHG-002": { status: "available", startTime: null, userName: null },
  "CHG-003": { status: "available", startTime: null, userName: null },
  "CHG-004": { status: "available", startTime: null, userName: null },
};
 
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
 
  // GET — return current state
  if (req.method === "GET") {
    const state = await redisGet("charger-state") || DEFAULT_STATE;
    return res.status(200).json(state);
  }
 
  // POST — update one charger
  if (req.method === "POST") {
    const { id, status, userName } = req.body;
    const state = await redisGet("charger-state") || DEFAULT_STATE;
 
    if (status === "occupied") {
      state[id] = { status: "occupied", startTime: Date.now(), userName };
    } else if (status === "available") {
      state[id] = { status: "available", startTime: null, userName: null };
    } else if (status === "fault") {
      state[id] = { status: "fault", startTime: null, userName: null };
    }
 
    await redisSet("charger-state", state);
    return res.status(200).json(state);
  }
 
  return res.status(405).json({ error: "Method not allowed" });
}
