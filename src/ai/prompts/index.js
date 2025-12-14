// /src/ai/prompts/index.js

import linaCorePrompt from "./core/lina.core.v1.js";
import logisticPrompt from "./sectors/logistic.v1.js";
import restaurantPrompt from "./sectors/restaurant.v1.js";
import realEstatePrompt from "./sectors/realestate.v1.js";

export function getPrompt({ sector }) {
  if (sector === "logistic") {
    return `${linaCorePrompt}\n\n${logisticPrompt}`;
  }

  if (sector === "restaurant") {
    return `${linaCorePrompt}\n\n${restaurantPrompt}`;
  }

  if (sector === "realestate") {
    return `${linaCorePrompt}\n\n${realEstatePrompt}`;
  }

  // default
  return linaCorePrompt;
}
