// /src/routes/chat.js

import express from "express";
import { getHistory, saveMessage } from "../services/memory.service.js";
import { talkToLina } from "../services/lina.service.js";
import { getCustomerConfig } from "../services/customerConfig.service.js";

const router = express.Router();

//------------------------------------------------------
// CHAT ENDPOINT — CUSTOMER BAZLI
//------------------------------------------------------
router.post("/chat", async (req, res) => {
  const { message, sessionId, customerId } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({
      error: "message and sessionId required",
    });
  }

  try {
    const history = await getHistory(sessionId);

    // 🔑 CUSTOMER → SECTOR
    const customerConfig = getCustomerConfig(customerId);
    const sector = customerConfig?.sector;

    const reply = await talkToLina({
      history,
      message,
      sector,
    });

    await saveMessage(sessionId, "user", message);
    await saveMessage(sessionId, "assistant", reply);

    return res.json({ reply });
  } catch (err) {
    console.error("❌ Chat error:", err);
    return res
      .status(500)
      .json({ error: "AI servisi şu anda yanıt veremiyor." });
  }
});

export default router;
