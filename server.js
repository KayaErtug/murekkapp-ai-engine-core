// /murekkapp-backend-clean/server.js
//------------------------------------------------------
// MUREKKAPP AI BACKEND
// Lina v2.0 — Premium Behavior + Few-Shot + Memory
//------------------------------------------------------

import "dotenv/config";
import express from "express";
import cors from "cors";

// ✅ YENİ: WhatsApp Botunu Router Olarak Çağır
import whatsappRouter from "./whatsapp-bot.js"; 

import { cleanupOldFiles } from "./utils/cleanup.js";
import chatRouter from "./src/routes/chat.js";
import { isRedisReady } from "./src/services/memory.service.js";

//------------------------------------------------------
// BOOTSTRAP
//------------------------------------------------------
// cleanupOldFiles(process.cwd()); 

const app = express();
const port = process.env.PORT || 4001;
const startedAt = Date.now();

// ✅ CORS AYARI: Hem localhost hem murekkapp.com'a izin ver
app.use(cors({
  origin: [
    "https://murekkapp.com",       // Canlı site
    "https://www.murekkapp.com",   // www versiyonu
    "http://localhost:5173",       // Local frontend (test için)
    "http://localhost:4001"        // Kendi kendine API çağrısı için
  ],
  credentials: true
}));

// Meta Webhook için JSON parser
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
// ROUTES
//------------------------------------------------------

// 1. Sohbet API'si
app.use("/api", chatRouter);

// 2. WhatsApp Webhook Bağlantısı
// Bu sayede: https://murekkapp.com/whatsapp/webhook adresi aktif olur
app.use("/whatsapp", whatsappRouter);

//------------------------------------------------------
// START SERVER
//------------------------------------------------------
app.listen(port, () => {
  console.log(`✅ Lina Backend running on Port: ${port}`);
  console.log(`🌍 Public URL: https://murekkapp.com (Varsayilan)`);
  console.log(`🔗 WhatsApp Webhook: /whatsapp/webhook`);
});