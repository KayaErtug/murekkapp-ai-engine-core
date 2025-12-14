// /src/services/lina.service.js
//------------------------------------------------------
// LINA SERVICE — STABLE (OPENAI ONLY)
// Gemini geçici olarak devre dışı
//------------------------------------------------------

import { buildPromptText } from "../ai/buildPrompt.js";
import OpenAI from "openai";

//------------------------------------------------------
// OPENAI CLIENT
//------------------------------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//------------------------------------------------------
// LINA TALK
//------------------------------------------------------
export async function talkToLina({ history, message, sector }) {
  const promptText = buildPromptText({
    history,
    userMessage: message,
    sector,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: promptText }],
      temperature: 0.3,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("OpenAI cevap üretmedi");
    }

    return reply;
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    throw new Error("AI şu anda yanıt veremiyor.");
  }
}
