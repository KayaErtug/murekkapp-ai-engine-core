// /src/ai/prompts/index.js

import linaCorePrompt from "./core/lina.core.v1.js";

import logisticPrompt from "./sectors/logistic.v1.js";
import restaurantPrompt from "./sectors/restaurant.v1.js";
import realEstatePrompt from "./sectors/realestate.v1.js";
import clinicPrompt from "./sectors/clinic.v1.js";
import marketPrompt from "./sectors/market.v1.js";

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

  if (sector === "clinic") {
    return `${linaCorePrompt}\n\n${clinicPrompt}`;
  }

  if (sector === "market") {
    return `${linaCorePrompt}\n\n${marketPrompt}`;
  }

  // default
  return linaCorePrompt;
}
