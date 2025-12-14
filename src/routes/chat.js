// /src/routes/chat.js

import express from "express";
import { getHistory, saveMessage } from "../services/memory.service.js";
import { talkToLina } from "../services/lina.service.js";

const router = express.Router();

//------------------------------------------------------
// CHAT ENDPOINT — UI HİÇ DEĞİŞMEZ
//------------------------------------------------------
router.post("/chat", async (req, res) => {
  const { message, sessionId, sector } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({
      error: "message and sessionId required",
    });
  }

  try {
    // 1) Hafızayı al
    const history = await getHistory(sessionId);

    // 2) Lina’ya sor
    const reply = await talkToLina({
      history,
      message,
    });

    // 3) Hafızaya kaydet
    await saveMessage(sessionId, "user", message);
    await saveMessage(sessionId, "assistant", reply);

    return res.json({ reply });
  } catch (err) {
    console.error("❌ Gemini error:", err);
    return res
      .status(500)
      .json({ error: "AI servisi şu anda yanıt veremiyor." });
  }
});

export default router;
