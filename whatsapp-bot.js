// /murekkapp-backend-clean/whatsapp-bot.js
//--------------------------------------------------------------
// MurekkAPP WhatsApp Lina v2.0
// Capabilities: Text (Chat), Voice (STT+TTS), Call Handling
//--------------------------------------------------------------

import dotenv from "dotenv";
dotenv.config();

import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;

import qrcode from "qrcode-terminal";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

import textToSpeech from "@google-cloud/text-to-speech";
import speech from "@google-cloud/speech";
import { createClient } from "redis";

//--------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4001";
const GOOGLE_KEYFILE = process.env.GOOGLE_TTS_KEY;

// ⚠️ ÖNEMLİ: Render/Linux sunucuda 'ffmpeg', Windows'ta 'C:/ffmpeg/bin/ffmpeg.exe'
// Otomatik algılama ekledim:
const isWin = process.platform === "win32";
const FFMPEG_PATH = isWin ? "C:/ffmpeg/bin/ffmpeg.exe" : "ffmpeg";

const VOICE_RATE_LIMIT_SECONDS = 30;

// Varsayılan müşteri ID (SaaS yapısına göre dinamikleştirilebilir)
const DEFAULT_CUSTOMER_ID = "demo-logistic"; 

//--------------------------------------------------------------
// Google clients
//--------------------------------------------------------------
const ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename: GOOGLE_KEYFILE });
const sttClient = new speech.SpeechClient({ keyFilename: GOOGLE_KEYFILE });

//--------------------------------------------------------------
// Redis
//--------------------------------------------------------------
let redis = null;
let redisReady = false;

if (process.env.REDIS_URL) {
  redis = createClient({ url: process.env.REDIS_URL });
  redis.on("error", (err) => console.error("Redis Error:", err));
  (async () => {
    try { await redis.connect(); redisReady = true; } catch {}
  })();
}

async function saveVoiceMeta(sessionId, data) {
  if (!redis || !redisReady) return;
  await redis.lPush(
    `voice_meta:${sessionId}`,
    JSON.stringify({ ...data, at: new Date().toISOString() })
  );
  await redis.lTrim(`voice_meta:${sessionId}`, 0, 24);
}

async function isRateLimited(sessionId) {
  if (!redis || !redisReady) return false;
  const key = `voice_rl:${sessionId}`;
  if (await redis.exists(key)) return true;
  await redis.set(key, "1", { EX: VOICE_RATE_LIMIT_SECONDS });
  return false;
}

//--------------------------------------------------------------
// WhatsApp Client
//--------------------------------------------------------------
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: { 
    headless: true, 
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] 
  },
});

client.on("qr", (qr) => {
  console.log("⚠️ QR KODU OLUŞTU (Scan Required):");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => console.log("✅ Lina WhatsApp Bot Aktif!"));

//--------------------------------------------------------------
// Helpers
//--------------------------------------------------------------
async function generateTTS(text, mp3Path) {
  const [res] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: { languageCode: "tr-TR", name: "tr-TR-Wavenet-D" }, // Ses tonunu buradan değiştirebilirsin
    audioConfig: { audioEncoding: "MP3" },
  });
  await fs.promises.writeFile(mp3Path, res.audioContent, "binary");
}

async function convertToWav(input, wav) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG_PATH, ["-y", "-i", input, "-ac", "1", "-ar", "16000", wav]);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error("FFmpeg error"))));
    p.on("error", (err) => reject(err));
  });
}

async function speechToText(wav) {
  const audioBytes = (await fs.promises.readFile(wav)).toString("base64");
  const [res] = await sttClient.recognize({
    audio: { content: audioBytes },
    config: { encoding: "LINEAR16", sampleRateHertz: 16000, languageCode: "tr-TR" },
  });
  return res.results?.map(r => r.alternatives[0].transcript).join(" ") || "";
}

//--------------------------------------------------------------
// 🔥 INTENT CLASSIFIER (Optional)
//--------------------------------------------------------------
async function classifyIntent(text) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { intent: "other", confidence: 0 };
    return await res.json();
  } catch {
    return { intent: "other", confidence: 0 };
  }
}

//--------------------------------------------------------------
// 📞 ARAMA YÖNETİMİ (CALL HANDLER)
//--------------------------------------------------------------
client.on('call', async (call) => {
  console.log('📞 Gelen arama:', call.from);
  // WhatsApp botları aramayı sesli yanıtlayamaz, reddedip mesaj atıyoruz.
  try {
    await call.reject();
    await client.sendMessage(call.from, "📞 Aramaları şu an açamıyorum. Bana **yazabilir** veya **sesli mesaj** gönderebilirsin. Hızlıca döneceğim! 👋");
  } catch (err) {
    console.error("Call reject error:", err);
  }
});

//--------------------------------------------------------------
// 💬 MESAJ YÖNETİMİ (TEXT & VOICE)
//--------------------------------------------------------------
client.on("message", async (msg) => {
  const from = msg.from;

  // Sadece Text, Audio ve PTT (Bas-Konuş) kabul et
  if (msg.type !== "chat" && msg.type !== "audio" && msg.type !== "ptt") return;
  
  // Grup mesajlarını engellemek istersen:
  if (from.includes("@g.us")) return;

  // Rate Limit Kontrolü (Spam koruma)
  // Text için daha esnek, ses için katı olabilir. Şimdilik sese koyduk.
  if ((msg.type === "audio" || msg.type === "ptt") && await isRateLimited(from)) {
    await msg.reply("✋ Biraz yavaşlayalım, önceki mesajını işliyorum...");
    return;
  }

  // 1️⃣ YAZILI MESAJ (TEXT)
  if (msg.type === "chat") {
    console.log(`📩 Mesaj (${from}): ${msg.body}`);
    // "Yazıyor..." efekti gönder (Simülasyon)
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    try {
      // Backend'e sor
      const replyRes = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg.body,
          sessionId: from, // Telefon numarasını Session ID yapıyoruz
          customerId: DEFAULT_CUSTOMER_ID
        }),
      });

      const data = await replyRes.json();
      const replyText = data.reply || "Üzgünüm, şu an cevap veremiyorum.";

      await msg.reply(replyText);
    } catch (err) {
      console.error("Text Chat Error:", err);
    } finally {
      await chat.clearState();
    }
  }

  // 2️⃣ SESLİ MESAJ (VOICE)
  else if (msg.type === "audio" || msg.type === "ptt") {
    console.log(`🎤 Sesli Mesaj (${from})`);
    await msg.reply("🎧 Dinliyorum...");

    const media = await msg.downloadMedia();
    if (!media?.data) return;

    const stamp = Date.now();
    const inFile = path.join(__dirname, `in-${stamp}.bin`);
    const wavFile = path.join(__dirname, `in-${stamp}.wav`);
    const outMp3 = path.join(__dirname, `out-${stamp}.mp3`);

    try {
      // Dosyayı kaydet ve dönüştür
      await fs.promises.writeFile(inFile, Buffer.from(media.data, "base64"));
      await convertToWav(inFile, wavFile);

      // STT (Sesi Yazıya Çevir)
      const transcript = await speechToText(wavFile);
      console.log(`📝 Transcript: ${transcript}`);

      if (!transcript.trim()) {
        await client.sendMessage(from, "Sesini tam duyamadım, tekrar eder misin?");
        return;
      }

      // Backend'e gönder
      const replyRes = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: transcript,
          sessionId: from,
          customerId: DEFAULT_CUSTOMER_ID
        }),
      });

      const { reply } = await replyRes.json();
      console.log(`🤖 AI Cevabı: ${reply}`);

      // TTS (Yazıyı Sese Çevir)
      await generateTTS(reply, outMp3);
      
      // Ses dosyasını gönder
      const audio = fs.readFileSync(outMp3).toString("base64");
      await client.sendMessage(from, new MessageMedia("audio/mpeg", audio));

    } catch (err) {
      console.error("Voice process error:", err);
      await client.sendMessage(from, "Sesini işlerken bir sorun oluştu.");
    } finally {
      // Temizlik
      [inFile, wavFile, outMp3].forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
    }
  }
});

//--------------------------------------------------------------
client.initialize();