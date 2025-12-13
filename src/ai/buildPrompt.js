// /src/ai/buildPrompt.js

import systemPrompt from "./prompts/lina.system.v2.js";

/**
 * History'yi insan-okur formatına çevirir
 * (Gemini için bilinçli tercih)
 */
function formatHistory(history) {
  const text =
    history
      ?.map((m) =>
        m.role === "assistant"
          ? `Lina: ${m.content}`
          : `Kullanıcı: ${m.content}`
      )
      .join("\n") || "";

  return text.trim() || "Yok.";
}

/**
 * Lina için FINAL prompt text üretir
 * Bu fonksiyon ileride:
 * - sektör promptu
 * - müşteri override
 * - A/B varyant
 * eklemek için genişletilecek
 */
export function buildPromptText({ history, userMessage }) {
  const historyText = formatHistory(history);

  return `
${systemPrompt}

--------------------------------
Önceki konuşma:
${historyText}

--------------------------------
Kullanıcı mesajı:
${userMessage}

Sadece Lina'nın cevabını üret.
`.trim();
}
