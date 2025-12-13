// /src/ai/buildPrompt.js

import linaSystemPrompt from "./prompts/lina.system.js";

export function buildLinaPrompt({ userMessage }) {
  return [
    {
      role: "system",
      content: linaSystemPrompt,
    },
    {
      role: "user",
      content: userMessage,
    },
  ];
}
