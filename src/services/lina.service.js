// /src/services/lina.service.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildPromptText } from "../ai/buildPrompt.js";

//------------------------------------------------------
// GEMINI CLIENT
//------------------------------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

//------------------------------------------------------
// LINA TALK
//------------------------------------------------------
export async function talkToLina({ history, message }) {
  const promptText = buildPromptText({
    history,
    userMessage: message,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 350,
    },
  });

  const reply = result?.response?.text?.()?.trim();

  if (!reply) {
    throw new Error("AI cevap üretmedi");
  }

  return reply;
}
