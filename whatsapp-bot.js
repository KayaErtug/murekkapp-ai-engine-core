// /murekkapp-backend-clean/whatsapp-bot.js
// V6: Official WhatsApp Cloud API Integration (Router Mode)
// Murekkapp.com Canlı Uyumlu

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// -----------------------------------------------------------------------------
// KONFİGÜRASYON
// -----------------------------------------------------------------------------
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; 
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN; 
const DEFAULT_CUSTOMER_ID = "demo-logistic"; 

// Backend URL: Canlıdaysa murekkapp.com, değilse localhost
// .env dosyasında BACKEND_URL=https://murekkapp.com olarak ayarlanmalı
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4001";

// -----------------------------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// -----------------------------------------------------------------------------

// Meta'ya Mesaj Gönderme
async function sendWhatsAppMessage(to, text) {
  if (!text) return;
  try {
    const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { preview_url: false, body: text }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    // Hata kontrolü
    const data = await response.json();
    if (data.error) console.error("❌ WhatsApp API Hatası:", data.error);
  } catch (err) {
    console.error("❌ Mesaj Gönderme Hatası:", err);
  }
}

// Yapay Zekadan Cevap Alma
async function getAIResponse(userMessage, senderId) {
  try {
    // Kendi sunucumuzdaki /api/chat endpoint'ine istek atıyoruz
    // Canlı ortamda https://murekkapp.com/api/chat adresine gider
    const res = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: userMessage, 
        sessionId: `wa_${senderId}`, 
        customerId: DEFAULT_CUSTOMER_ID 
      }),
    });
    
    const data = await res.json();
    return data.reply;
  } catch (error) {
    console.error("AI API Bağlantı Hatası:", error);
    return "Şu an sistemlerimde bir bakım var, lütfen daha sonra tekrar yaz. 🤖";
  }
}

// -----------------------------------------------------------------------------
// WEBHOOK ROUTES
// -----------------------------------------------------------------------------

// 1. Doğrulama (Meta'nın token kontrolü)
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ WhatsApp Webhook Doğrulandı!");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// 2. Mesaj Karşılama
router.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const msgObject = body.entry[0].changes[0].value.messages[0];
      const senderId = msgObject.from;
      const msgType = msgObject.type;
      
      console.log(`📩 WhatsApp Mesajı (${senderId}):`, msgType);

      if (msgType === "text") {
        const userText = msgObject.text.body;
        // AI'ya sor ve cevapla
        const aiReply = await getAIResponse(userText, senderId);
        await sendWhatsAppMessage(senderId, aiReply);
      } else {
        await sendWhatsAppMessage(senderId, "Şimdilik sadece metin mesajlarını anlayabiliyorum. 📝");
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

export default router;