import { Router } from "express";
import { pool } from "../db.js";

export const router = Router();

// Secretaria salva a assinatura push do navegador dela
router.post("/subscribe", async (req, res) => {
  const { endpoint, keys, tipo = "secretaria" } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Assinatura inválida." });
  }

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, keys, tipo)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE SET keys = $2`,
      [endpoint, JSON.stringify(keys), tipo]
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// Retorna a chave pública VAPID para o frontend usar
router.get("/vapid-public-key", (_, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});
