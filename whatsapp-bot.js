// /murekkapp-backend-clean/whatsapp-bot.js
//--------------------------------------------------------------
// MurekkAPP WhatsApp Lina
// Voice -> STT -> INTENT -> AI -> Voice
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
const FFMPEG_PATH = "C:/ffmpeg/bin/ffmpeg.exe";
const VOICE_RATE_LIMIT_SECONDS = 30;

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
  redis.on("error", () => {});
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
// WhatsApp
//--------------------------------------------------------------
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: { headless: true, args: ["--no-sandbox"] },
});

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("✅ Lina aktif"));

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
    const p = spawn(FFMPEG_PATH, ["-y", "-i", input, "-ac", "1", "-ar", "16000", wav]);
    p.on("close", (c) => (c === 0 ? resolve() : reject()));
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
// 🔥 INTENT CLASSIFIER
//--------------------------------------------------------------
async function classifyIntent(text) {
  const res = await fetch(`${BACKEND_URL}/api/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return { intent: "other", confidence: 0 };
  return await res.json();
}

//--------------------------------------------------------------
// MESSAGE HANDLER
//--------------------------------------------------------------
client.on("message", async (msg) => {
  const from = msg.from;

  if (msg.type !== "audio" && msg.type !== "ptt") return;
  if (await isRateLimited(from)) return;

  const processing = await client.sendMessage(from, "🎧 Dinliyorum…");

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
    const intentData = await classifyIntent(transcript);

    await saveVoiceMeta(from, {
      transcript,
      intent: intentData.intent,
      confidence: intentData.confidence,
    });

    const replyRes = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: transcript,
        sessionId: from,
        intent: intentData.intent,
      }),
    });

    const { reply } = await replyRes.json();

    await generateTTS(reply, outMp3);
    const audio = fs.readFileSync(outMp3).toString("base64");
    await client.sendMessage(from, new MessageMedia("audio/mpeg", audio));
  } finally {
    try { await processing.delete(true); } catch {}
    [inFile, wavFile, outMp3].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
  }
});

//--------------------------------------------------------------
client.initialize();
