// /src/ai/prompts/index.js

import linaCorePrompt from "./core/lina.core.v1.js";

// İleride buraya eklenecek:
// import restaurantPrompt from "./sectors/restaurant.v1.js";
// import clinicPrompt from "./sectors/clinic.v1.js";

export function getPrompt({ sector }) {
  // 🐢 Kaplumbağa modu: şimdilik HER ZAMAN core
  // sector geldiğinde burada switch/lookup yapacağız

  return linaCorePrompt;
}
