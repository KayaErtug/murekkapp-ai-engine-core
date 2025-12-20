// /murekkapp-backend-clean/whatsapp-bot.js
// V7: Official WhatsApp Cloud API Integration (Router Mode)
// ✅ Render / Production uyumlu
// ✅ Token env uyumu (WHATSAPP_TOKEN veya WHATSAPP_ACCESS_TOKEN)
// ✅ BACKEND_URL prod default: https://ai.murekkapp.com

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// -----------------------------------------------------------------------------
// KONFİGÜRASYON
// -----------------------------------------------------------------------------

// Render’da sen WHATSAPP_TOKEN kullanıyorsun. Bazı ortamlarda WHATSAPP_ACCESS_TOKEN olabilir.
// İkisini de destekleyelim:
const WHATSAPP_TOKEN =
  process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

// Phone Number ID (Meta Cloud API’deki phone number id)
const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;

// Webhook verify token
const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY;

// Default müşteri kimliği (senin sisteminde kullanılıyor)
const DEFAULT_CUSTOMER_ID = process.env.DEFAULT_CUSTOMER_ID || "demo-logistic";

// Backend URL: Prod default localhost OLMASIN.
// Render’da aynı servis üzerinde /api/chat endpoint’i zaten var.
const BACKEND_URL = process.env.BACKEND_URL || "https://ai.murekkapp.com";

// Graph API version (istersen env’den de yönetebilirsin)
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v22.0";

// Basit validasyon logu (secret yazmaz)
console.log("✅ WhatsApp Bot Config:", {
  hasToken: Boolean(WHATSAPP_TOKEN),
  hasPhoneNumberId: Boolean(PHONE_NUMBER_ID),
  backendUrl: BACKEND_URL,
  graphVersion: GRAPH_VERSION,
});

// -----------------------------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// -----------------------------------------------------------------------------

// Meta'ya mesaj gönderme
async function sendWhatsAppMessage(to, text) {
  if (!text) return;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("❌ WhatsApp config eksik:", {
      hasToken: Boolean(WHATSAPP_TOKEN),
      hasPhoneNumberId: Boolean(PHONE_NUMBER_ID),
    });
    return;
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;

    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || data?.error) {
      console.error("❌ WhatsApp API Hatası:", {
        status: response.status,
        data,
      });
    }
  } catch (err) {
    console.error("❌ Mesaj Gönderme Hatası:", err);
  }
}

// Yapay zekadan cevap alma
async function getAIResponse(userMessage, senderId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        sessionId: `wa_${senderId}`,
        customerId: DEFAULT_CUSTOMER_ID,
      }),
    });

    // Eğer backend hata dönerse
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("❌ AI API HTTP Hatası:", {
        status: res.status,
        body: text?.slice?.(0, 500),
      });
      return "Şu an sistemlerimde bir bakım var, birazdan tekrar yazar mısın? 🤖";
    }

    const data = await res.json().catch(() => ({}));

    // chat.js reply alanı farklıysa fallback
    const reply = data.reply || data.message || data.text;

    return reply || "Anladım. Devam edebilir misin? 🙂";
  } catch (error) {
    console.error("❌ AI API Bağlantı Hatası:", error);
    return "Şu an sistemlerimde bir bakım var, lütfen daha sonra tekrar yaz. 🤖";
  }
}

// -----------------------------------------------------------------------------
// WEBHOOK ROUTES
// -----------------------------------------------------------------------------

// 1) Doğrulama (Meta'nın verify challenge kontrolü)
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!mode || !token) return res.sendStatus(400);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WhatsApp Webhook Doğrulandı!");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// 2) Mesaj karşılama
router.post("/webhook", async (req, res) => {
  const body = req.body;

  // Meta webhook’ta hızlı 200 önemli
  // (ama bu handler async çalışıyor; yine de en sonda 200 dönüyoruz)
  if (!body?.object) return res.sendStatus(404);

  try {
    const change = body?.entry?.[0]?.changes?.[0]?.value;
    const msgObject = change?.messages?.[0];

    if (!msgObject) {
      // status update vs. olabilir
      return res.sendStatus(200);
    }

    const senderId = msgObject.from;
    const msgType = msgObject.type;

    console.log(`📩 WhatsApp Mesajı (${senderId}):`, msgType);

    if (msgType === "text") {
      const userText = msgObject.text?.body || "";
      const aiReply = await getAIResponse(userText, senderId);
      await sendWhatsAppMessage(senderId, aiReply);
    } else {
      await sendWhatsAppMessage(
        senderId,
        "Şimdilik sadece metin mesajlarını anlayabiliyorum. 📝"
      );
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ WhatsApp webhook işleme hatası:", err);
    return res.sendStatus(200); // Meta retry yapmasın diye yine 200
  }
});

export default router;
