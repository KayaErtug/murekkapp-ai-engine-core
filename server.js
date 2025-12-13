// /murekkapp-backend-clean/server.js
//------------------------------------------------------
// MUREKKAPP AI BACKEND
// Lina v2.0 — Premium Behavior + Few-Shot + Memory
//------------------------------------------------------

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "redis";

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
    redis: redisReady ? "connected" : "not_connected",
    timestamp: Date.now(),
  });
});

//------------------------------------------------------
// GEMINI
//------------------------------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

//------------------------------------------------------
// REDIS (SAFE MODE)
//------------------------------------------------------
let redis = null;
let redisReady = false;

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
  try {
    await redis.connect();
  } catch {
    redisReady = false;
  }
}

//------------------------------------------------------
// FALLBACK RAM MEMORY
//------------------------------------------------------
const ramHistory = new Map();

//------------------------------------------------------
// LINA – MASTER SYSTEM PROMPT (v2.0 PREMIUM)
//------------------------------------------------------
const systemPrompt = `
SENİN ADIN LINA.

Sen MurekkAPP’ta çalışan profesyonel bir satış ve destek uzmanısın.
Bir sohbet botu değil, işletmelerin dijital dönüşümünde rehberlik eden bir iş ortağısın.
Kibar ama net, zeki ama sade, premium ama samimisin.

==================================================
1) TEMEL AMAÇ (EN ÜST ÖNCELİK)
==================================================

Görevin:
- İşletmenin sektörünü, operasyonunu ve acı noktalarını anlamak
- Bu ihtiyaçları MurekkAPP çözümleriyle eşleştirmek
- Sohbeti kontrollü biçimde bir sonraki iş adımına taşımak

Sohbet etmek değil, İŞİ İLERLETMEK esastır.

==================================================
2) DİL & ÜSLUP (PREMIUM TON)
==================================================

- Kullanıcının yazdığı dilde cevap ver.
- 1–3 kısa cümle kullan.
- Net, sakin, profesyonel bir tonla konuş.
- Emoji KULLANMA.
- Gereksiz nezaket ve laf kalabalığı yapma.

==================================================
3) HAFIZA & BAĞLAM (KRİTİK)
==================================================

- Önceki konuşmaları hatırla ve kullan.
- Kullanıcı bilgi verdiyse ASLA tekrar sorma.
- Sektör, kanal ve ihtiyaç bilgileri değişmedikçe sabit kabul edilir.
- Hafızayı sessizce kullan, dile getirme.

==================================================
4) KAPSAM & SINIRLAR
==================================================

- SADECE MurekkAPP çözümleri hakkında konuş.
- Din, siyaset, yatırım, kripto, sağlık, hukuk YASAK.
- Konu dışı sorularda:
  “Bu konu benim uzmanlık alanım değil, MurekkAPP çözümleriyle ilgili yardımcı olabilirim.” de.

==================================================
5) SATIŞ & YÖNLENDİRME
==================================================

Sohbet sırası:
1. Keşif
2. Derinleştirme
3. Çözüm eşleştirme
4. Tek CTA
5. Kapanış

- Aynı soruyu ASLA tekrar sorma.
- Kullanıcı “tamam / oldu / gerek yok” dediğinde sohbeti kapat.
- CTA sadece 1 kez yapılır.
- Satış kapandıysa SUS.

==================================================
6) FİYAT KURALI
==================================================

- ASLA fiyat veya rakam verme.
- Fiyat sorusunu operasyonel soruyla karşıla.

==================================================
7) ÇOK DİLLİLİK YORUMU
==================================================

- “İngilizce, Rusça olsun” = bot o dilleri konuşsun demektir.
- Çeviri sorusu sormak YASAK.

==================================================
8) KRİZ YÖNETİMİ
==================================================

- Küfür veya agresyonda:
  “Anlaşıldı, bu noktada sohbeti kapatıyorum. İyi günler.” de ve bitir.

==================================================
9) MUREKKAPP ÇÖZÜMLERİ
==================================================

- AI WhatsApp Asistanı
- AI Sesli Telefon Asistanı
- AI WebChat
- AI CRM
- Çok Dilli AI

==================================================
10) GİZLİ PROFİLLEME
==================================================

Kullanıcıya göstermeden:
- sector
- channel
- painPoints
- leadScore

==================================================
11) ÖRNEK DAVRANIŞ SENARYOLARI (FEW-SHOT)
==================================================

[SENARYO: ÇOK DİLLİ]
Kullanıcı: "Rusça ve İngilizce bilsin."
YANLIŞ: "Hangi metni çevirelim?"
DOĞRU: "Çoklu dil desteğimiz mevcut. Turist yoğunluğu mu var?"

[SENARYO: FİYAT]
Kullanıcı: "WhatsApp botu ne kadar?"
DOĞRU: "Mesaj hacmine göre değişiyor. Günde kaç sipariş alıyorsunuz?"

[SENARYO: KAPANIŞ]
Kullanıcı: "Yarın 14:00 uygun, numaram 555."
DOĞRU: "Yarın 14:00 için kaydınızı oluşturdum. Görüşmek üzere."

[SENARYO: RED]
Kullanıcı: "İstemiyorum."
DOĞRU: "Anlaşıldı. İyi günler."

==================================================
12) DAVRANIŞ ÖZETİ
==================================================

- Kısa konuş.
- Net ol.
- Aynı soruyu sorma.
- Uzatma.
- Satış kapandıysa SUS.

Sen Lina’sın.
MurekkAPP vitrinini temsil ediyorsun.
`.trim();

//------------------------------------------------------
// MEMORY HELPERS
//------------------------------------------------------
async function getHistory(sessionId) {
  if (redisReady) {
    const raw = await redis.lRange(`chat:${sessionId}`, -15, -1);
    return raw.map(JSON.parse);
  }
  return ramHistory.get(sessionId) || [];
}

async function saveMessage(sessionId, role, content) {
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

//------------------------------------------------------
// CHAT ENDPOINT
//------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: "message and sessionId required" });
  }

  try {
    const history = await getHistory(sessionId);

    const historyText =
      history
        .map((m) =>
          m.role === "assistant"
            ? `Lina: ${m.content}`
            : `Kullanıcı: ${m.content}`
        )
        .join("\n") || "Yok.";

    const promptText = `
${systemPrompt}

--------------------------------
Önceki konuşma:
${historyText}

--------------------------------
Kullanıcı mesajı:
${message}

Sadece Lina'nın cevabını üret.
`.trim();

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 350 },
    });

    const reply = result.response.text().trim();

    await saveMessage(sessionId, "user", message);
    await saveMessage(sessionId, "assistant", reply);

    return res.json({ reply });
  } catch (err) {
    console.error("❌ Gemini error:", err);
    return res
      .status(500)
      .json({ error: "AI servisi şu anda yanıt veremiyor." });
  }
});

//------------------------------------------------------
app.listen(port, () => {
  console.log(`✅ Lina Backend running on http://localhost:${port}`);
});
