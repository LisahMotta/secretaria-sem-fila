import { Router } from "express";
import { pool } from "../db.js";
import { enviarPushSecretaria } from "../push.js";

export const router = Router();

const SERVICE_LABELS = {
  historico: "Histórico Escolar",
  declaracao: "Declaração de Matrícula",
  passe: "Passe Escolar",
  documentos: "Entrega de Documentos",
  outros: "Outros Atendimentos",
};

router.post("/", async (req, res) => {
  const { protocol, service, date, slot, responsible, student,
          doc_types, outros, historico, passe } = req.body;

  if (!protocol || !service || !responsible?.name || !responsible?.phone) {
    return res.status(400).json({ error: "Dados obrigatórios ausentes." });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO agendamentos
         (protocol, service, date, slot, responsible, student, doc_types, outros, historico, passe)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [protocol, service, date || null, slot || null,
       JSON.stringify(responsible),
       student ? JSON.stringify(student) : null,
       doc_types ? JSON.stringify(doc_types) : null,
       outros ? JSON.stringify(outros) : null,
       historico ? JSON.stringify(historico) : null,
       passe ? JSON.stringify(passe) : null]
    );

    const agendamento = rows[0];

    // Dispara notificação push para a secretaria
    await enviarPushSecretaria({
      title: "Novo agendamento — " + (SERVICE_LABELS[service] || service),
      body: `${responsible.name} · ${date ? date + (slot ? " às " + slot : "") : "Sem data definida"}`,
      url: "/painel",
      protocol,
    });

    return res.status(201).json({ ok: true, agendamento });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Protocolo duplicado." });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// Listar agendamentos (painel da secretaria)
router.get("/", async (req, res) => {
  const { data, status } = req.query;
  let query = "SELECT * FROM agendamentos WHERE 1=1";
  const params = [];

  if (data) {
    params.push(data);
    query += ` AND date = $${params.length}`;
  }
  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }

  query += " ORDER BY criado_em DESC LIMIT 100";

  try {
    const { rows } = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// Atualizar status (confirmar / cancelar)
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusPermitidos = ["pendente", "confirmado", "cancelado", "concluido"];
  if (!statusPermitidos.includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE agendamentos
         SET status = $1, atualizado_em = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: "Não encontrado." });
    return res.json({ ok: true, agendamento: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});
