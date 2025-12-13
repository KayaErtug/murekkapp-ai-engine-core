// /src/services/memory.service.js

import { createClient } from "redis";

//------------------------------------------------------
// REDIS (SAFE MODE)
//------------------------------------------------------
let redis = null;
let redisReady = false;

//------------------------------------------------------
// FALLBACK RAM MEMORY
//------------------------------------------------------
const ramHistory = new Map();

if (process.env.REDIS_URL) {
  redis = createClient({ url: process.env.REDIS_URL });

  redis.on("ready", () => {
    redisReady = true;
    console.log("✅ Redis connected");
  });

  redis.on("error", (err) => {
    redisReady = false;
    console.error("❌ Redis error:", err.message);
  });

  (async () => {
    try {
      await redis.connect();
    } catch {
      redisReady = false;
    }
  })();
}

//------------------------------------------------------
// PUBLIC HELPERS
//------------------------------------------------------
export function isRedisReady() {
  return redisReady;
}

export async function getHistory(sessionId) {
  if (redisReady) {
    const raw = await redis.lRange(`chat:${sessionId}`, -15, -1);
    return raw.map(JSON.parse);
  }

  return ramHistory.get(sessionId) || [];
}

export async function saveMessage(sessionId, role, content) {
  const item = JSON.stringify({ role, content });

  if (redisReady) {
    await redis.rPush(`chat:${sessionId}`, item);
    await redis.lTrim(`chat:${sessionId}`, -15, -1);
  } else {
    const arr = ramHistory.get(sessionId) || [];
    arr.push({ role, content });
    ramHistory.set(sessionId, arr.slice(-15));
  }
}
