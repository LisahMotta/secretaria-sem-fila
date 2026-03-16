import { Router } from "express";
import { pool } from "../db.js";
import { verificarToken } from "./auth.js";

export const router = Router();

// Público: retorna slots bloqueados de uma data (+ dias inteiros bloqueados)
router.get("/public", async (req, res) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ error: "Parâmetro data obrigatório." });
  try {
    const { rows } = await pool.query(
      "SELECT slot, motivo FROM bloqueios WHERE date=$1",
      [data]
    );
    const diaBloqueado = rows.some(r => r.slot === null);
    const slotsBloqueados = rows.filter(r => r.slot !== null).map(r => r.slot);
    return res.json({ diaBloqueado, slotsBloqueados });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// Listar bloqueios (autenticado)
router.get("/", verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM bloqueios ORDER BY date ASC, slot ASC NULLS FIRST"
    );
    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// Criar bloqueio (autenticado)
router.post("/", verificarToken, async (req, res) => {
  const { date, slot, motivo } = req.body;
  if (!date || !motivo) return res.status(400).json({ error: "Data e motivo são obrigatórios." });
  try {
    const { rows } = await pool.query(
      "INSERT INTO bloqueios (date, slot, motivo, criado_por) VALUES ($1,$2,$3,$4) RETURNING *",
      [date, slot || null, motivo.trim(), req.user.nome]
    );
    return res.status(201).json(rows[0]);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// Excluir bloqueio (autenticado)
router.delete("/:id", verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM bloqueios WHERE id=$1 RETURNING id", [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Bloqueio não encontrado." });
    return res.json({ ok: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});
