// /murekkapp-backend-clean/server.js
//------------------------------------------------------
// MUREKKAPP AI BACKEND
// Lina v2.0 — Premium Behavior + Few-Shot + Memory
//------------------------------------------------------

import dotenv from "dotenv";
dotenv.config();
console.log("ENV CHECK → OPENAI_API_KEY =", process.env.OPENAI_API_KEY);



import express from "express";
import cors from "cors";

import { cleanupOldFiles } from "./utils/cleanup.js";
import chatRouter from "./src/routes/chat.js";
import { isRedisReady } from "./src/services/memory.service.js";

//------------------------------------------------------
// BOOTSTRAP
//------------------------------------------------------
cleanupOldFiles(process.cwd());

const app = express();
const port = process.env.PORT || 4001;
const startedAt = Date.now();

app.use(cors({ origin: "*" }));
app.use(express.json());

//------------------------------------------------------
// HEALTH CHECK (RENDER / UPTIME / WARM-UP)
//------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "MurekkAPP AI Engine",
    status: "running",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    redis: isRedisReady() ? "connected" : "not_connected",
    timestamp: Date.now(),
  });
});

//------------------------------------------------------
// ROUTES
//------------------------------------------------------
app.use("/api", chatRouter);

//------------------------------------------------------
// START SERVER
//------------------------------------------------------
app.listen(port, () => {
  console.log(`✅ Lina Backend running on http://localhost:${port}`);
});
