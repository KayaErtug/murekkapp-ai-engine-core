// /src/ai/prompts/index.js

import linaCorePrompt from "./core/lina.core.v1.js";
import logisticPrompt from "./sectors/logistic.v1.js";

export function getPrompt({ sector }) {
  if (sector === "logistic") {
    return `${linaCorePrompt}\n\n${logisticPrompt}`;
  }

  // default
  return linaCorePrompt;
}
