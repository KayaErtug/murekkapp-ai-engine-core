// /murekkapp-backend-clean/server.js
//------------------------------------------------------
// MUREKKAPP AI BACKEND
//------------------------------------------------------

import "dotenv/config";
import express from "express";
import cors from "cors";

// WhatsApp Router
import whatsappRouter from "./whatsapp-bot.js";

import chatRouter from "./src/routes/chat.js";
import { isRedisReady } from "./src/services/memory.service.js";

//------------------------------------------------------
// BOOTSTRAP
//------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 4001;
const startedAt = Date.now();

// ✅ CORS
app.use(
  cors({
    origin: [
      "https://murekkapp.com",
      "https://www.murekkapp.com",
      "http://localhost:5173",
      "http://localhost:4001",
    ],
    credentials: true,
  })
);

// ✅ JSON parser (Meta webhooks POST için)
app.use(express.json());

//------------------------------------------------------
// HEALTH CHECK
//------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "MurekkAPP AI Engine",
    status: "running",
    env: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    redis: isRedisReady() ? "connected" : "not_connected",
    timestamp: Date.now(),
  });
});

//------------------------------------------------------
// ✅ META WEBHOOK (Messenger + Instagram) — TEK NOKTA
//------------------------------------------------------

// 1) VERIFY (Meta buraya GET atar)
app.get("/webhooks/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Verify token'ı tek yerden yönetelim
  // Render'da WHATSAPP_VERIFY_TOKEN = murekkapp-verify idi, onu kullanıyoruz.
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Meta webhook verified (Messenger/Instagram)");
    return res.status(200).send(challenge);
  }

  console.log("❌ Meta webhook verify failed", { mode, token });
  return res.sendStatus(403);
});

// 2) EVENTS (Meta mesajları buraya POST eder)
app.post("/webhooks/meta", (req, res) => {
  // ÖNEMLİ: Meta hızlı 200 ister
  res.sendStatus(200);

  // Şimdilik sadece loglayalım (sonra AI pipeline'a bağlarız)
  console.log("📩 Meta webhook event received:", JSON.stringify(req.body));
});

//------------------------------------------------------
// ROUTES
//------------------------------------------------------

// 1) Webchat / API
app.use("/api", chatRouter);

// 2) WhatsApp webhook
app.use("/whatsapp", whatsappRouter);

//------------------------------------------------------
// START SERVER (TEK KEZ!)
//------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Lina Backend running on Port: ${PORT}`);
  console.log(`🌍 Primary URL: https://ai.murekkapp.com`);
  console.log(`🔗 Meta Webhook: /webhooks/meta`);
  console.log(`🔗 WhatsApp Webhook: /whatsapp/webhook`);
});
