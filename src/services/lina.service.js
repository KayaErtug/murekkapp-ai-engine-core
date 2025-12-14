// /src/services/lina.service.js
//------------------------------------------------------
// LINA SERVICE — MULTI MODEL READY (v1)
// Primary: OpenAI
// Fallback: Gemini
//------------------------------------------------------

import { buildPromptText } from "../ai/buildPrompt.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

//------------------------------------------------------
// MODEL CLIENTS
//------------------------------------------------------

// OpenAI (PRIMARY)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Gemini (FALLBACK)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

//------------------------------------------------------
// ACTIVE MODEL (ileride DB / panelden gelir)
//------------------------------------------------------
const ACTIVE_MODEL = process.env.LINA_ACTIVE_MODEL || "openai";
// openai | gemini

//------------------------------------------------------
// OPENAI CALL
//------------------------------------------------------
async function talkWithOpenAI(promptText) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: promptText }],
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content?.trim();
}

//------------------------------------------------------
// GEMINI CALL
//------------------------------------------------------
async function talkWithGemini(promptText) {
  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: promptText }] }],
  });

  return result.response.text().trim();
}

//------------------------------------------------------
// LINA TALK — MULTI MODEL
//------------------------------------------------------
export async function talkToLina({ history, message, sector }) {
  const promptText = buildPromptText({
    history,
    userMessage: message,
    sector,
  });

  // 1️⃣ PRIMARY MODEL
  try {
    if (ACTIVE_MODEL === "openai") {
      const reply = await talkWithOpenAI(promptText);
      if (reply) return reply;
    }

    if (ACTIVE_MODEL === "gemini") {
      const reply = await talkWithGemini(promptText);
      if (reply) return reply;
    }
  } catch (err) {
    console.warn("⚠️ Primary model failed:", err.message);
  }

  // 2️⃣ FALLBACK → GEMINI
  try {
    const reply = await talkWithGemini(promptText);
    if (reply) return reply;
  } catch (err) {
    console.error("❌ Gemini fallback failed:", err.message);
  }

  throw new Error("Hiçbir AI modeli cevap üretemedi");
}
