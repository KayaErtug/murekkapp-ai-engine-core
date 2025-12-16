// /murekkapp-backend-clean/whatsapp-bot.js

import dotenv from "dotenv";
dotenv.config();

import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;

// QR kütüphanesini sildik, artık QR basamaz!
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import textToSpeech from "@google-cloud/text-to-speech";
import speech from "@google-cloud/speech";
import { createClient } from "redis";

//--------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4001";
const GOOGLE_KEYFILE = process.env.GOOGLE_TTS_KEY;
const VOICE_RATE_LIMIT_SECONDS = 30;
const DEFAULT_CUSTOMER_ID = "demo-logistic"; 

// 📱 SENİN NUMARAN (Pairing Code İçin - Başında + yok)
const MY_PHONE_NUMBER = "902589110718"; 

//--------------------------------------------------------------
// Google & Redis Setup
//--------------------------------------------------------------
const ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename: GOOGLE_KEYFILE });
const sttClient = new speech.SpeechClient({ keyFilename: GOOGLE_KEYFILE });

let redis = null;
let redisReady = false;

if (process.env.REDIS_URL) {
  redis = createClient({ url: process.env.REDIS_URL });
  redis.on("error", (err) => console.error("Redis Error:", err));
  (async () => {
    try { await redis.connect(); redisReady = true; } catch {}
  })();
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

let isPairingRequested = false;

// 🟢 BURASI ÇOK ÖNEMLİ: QR GELDİĞİNDE SADECE KOD İSTİYORUZ
client.on("qr", async (qr) => {
  if (!isPairingRequested) {
    isPairingRequested = true;
    console.log(`\n⏳ ${MY_PHONE_NUMBER} için Eşleşme Kodu isteniyor... Lütfen bekleyin.`);
    
    try {
      // 5 saniye bekle (bağlantı otursun)
      await new Promise(r => setTimeout(r, 5000));
      
      const code = await client.requestPairingCode(MY_PHONE_NUMBER);
      
      console.log("\n========================================");
      console.log("🔑 EŞLEŞME KODUNUZ: " + code);
      console.log("========================================");
      console.log("1. WhatsApp'ı aç");
      console.log("2. Ayarlar > Bağlı Cihazlar > Cihaz Bağla");
      console.log("3. 'Telefon numarası kullanarak bağla'ya bas");
      console.log("4. Bu kodu gir: " + code);
      console.log("========================================\n");
      
    } catch (err) {
      console.error("❌ Kod alma hatası:", err);
      isPairingRequested = false;
    }
  }
});

client.on("ready", () => console.log("✅ Lina WhatsApp Bot Aktif!"));

//--------------------------------------------------------------
// Helpers
//--------------------------------------------------------------
async function generateTTS(text, mp3Path) {
  const [res] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: { languageCode: "tr-TR", name: "tr-TR-Wavenet-D" },
    audioConfig: { audioEncoding: "MP3" },
  });
  await fs.promises.writeFile(mp3Path, res.audioContent, "binary");
}

async function convertToWav(input, wav) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ["-y", "-i", input, "-ac", "1", "-ar", "16000", wav]);
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
// Event Handlers
//--------------------------------------------------------------
client.on('call', async (call) => {
  try { await call.reject(); await client.sendMessage(call.from, "📞 Aramaları açamıyorum, bana yazabilirsin."); } catch {}
});

client.on("message", async (msg) => {
  const from = msg.from;
  if (msg.type !== "chat" && msg.type !== "audio" && msg.type !== "ptt") return;
  if (from.includes("@g.us")) return;

  if ((msg.type === "audio" || msg.type === "ptt") && await isRateLimited(from)) {
    await msg.reply("✋ Biraz yavaşlayalım...");
    return;
  }

  // TEXT
  if (msg.type === "chat") {
    const chat = await msg.getChat();
    await chat.sendStateTyping();
    try {
      const replyRes = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg.body, sessionId: from, customerId: DEFAULT_CUSTOMER_ID }),
      });
      const data = await replyRes.json();
      await msg.reply(data.reply || "...");
    } catch (err) { console.error(err); }
    finally { await chat.clearState(); }
  }

  // VOICE
  else if (msg.type === "audio" || msg.type === "ptt") {
    await msg.reply("🎧 Dinliyorum...");
    const media = await msg.downloadMedia();
    if (!media?.data) return;

    const stamp = Date.now();
    const inFile = path.join(__dirname, `in-${stamp}.bin`);
    const wavFile = path.join(__dirname, `in-${stamp}.wav`);
    const outMp3 = path.join(__dirname, `out-${stamp}.mp3`);

    try {
      await fs.promises.writeFile(inFile, Buffer.from(media.data, "base64"));
      await convertToWav(inFile, wavFile);
      const transcript = await speechToText(wavFile);
      
      if (!transcript.trim()) { await client.sendMessage(from, "Sesini tam duyamadım."); return; }

      const replyRes = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript, sessionId: from, customerId: DEFAULT_CUSTOMER_ID }),
      });

      const { reply } = await replyRes.json();
      await generateTTS(reply, outMp3);
      const audio = fs.readFileSync(outMp3).toString("base64");
      await client.sendMessage(from, new MessageMedia("audio/mpeg", audio));
    } catch (err) { console.error(err); await client.sendMessage(from, "Hata oluştu."); }
    finally { [inFile, wavFile, outMp3].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); }); }
  }
});

console.log("🚀 LINA V3 BAŞLIYOR... (EŞLEŞME KODU MODU)");
client.initialize();