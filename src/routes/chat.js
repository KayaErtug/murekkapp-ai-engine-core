// /src/routes/chat.js

import express from "express";
import { talkToLina } from "../services/lina.service.js";

const router = express.Router();

router.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const reply = await talkToLina({ message });

    res.json({
      reply,
      sessionId: sessionId || "default-session",
    });
  } catch (err) {
    console.error("❌ Lina error:", err);
    res.status(500).json({ error: "AI servisi yanıt veremiyor" });
  }
});

export default router;
