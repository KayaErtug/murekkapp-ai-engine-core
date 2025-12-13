// /src/services/lina.service.js

import OpenAI from "openai";
import { buildLinaPrompt } from "../ai/buildPrompt.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function talkToLina({ message }) {
  const messages = buildLinaPrompt({
    userMessage: message,
  });

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.4,
  });

  const reply = completion.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("AI cevap üretmedi");
  }

  return reply;
}
