import { Router } from "express";
import { pool } from "../db.js";
import { enviarPushSecretaria } from "../push.js";
import { verificarToken } from "./auth.js";
import {
  whatsappNovoAgendamento,
  whatsappConfirmacaoResponsavel,
  whatsappStatusAtualizado,
} from "../whatsapp.js";

export const router = Router();

const SERVICE_LABELS = {
  historico:  "Histórico Escolar",
  declaracao: "Declaração de Matrícula",
  passe:      "Passe Escolar",
  documentos: "Entrega de Documentos",
  outros:     "Outros Atendimentos",
};

router.post("/", async (req, res) => {
  const { protocol, service, date, slot, responsible, student,
          doc_types, outros, historico, passe } = req.body;
  if (!protocol || !service || !responsible?.name || !responsible?.phone)
    return res.status(400).json({ error: "Dados obrigatórios ausentes." });
  try {
    const { rows } = await pool.query(
      `INSERT INTO agendamentos
         (protocol,service,date,slot,responsible,student,doc_types,outros,historico,passe)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [protocol, service, date||null, slot||null,
       JSON.stringify(responsible),
       student   ? JSON.stringify(student)   : null,
       doc_types ? JSON.stringify(doc_types) : null,
       outros    ? JSON.stringify(outros)    : null,
       historico ? JSON.stringify(historico) : null,
       passe     ? JSON.stringify(passe)     : null]
    );
    await enviarPushSecretaria({
      title: "Novo agendamento — " + (SERVICE_LABELS[service] || service),
      body: `${responsible.name} · ${date ? date+(slot?" às "+slot:"") : "Sem data"}`,
      url: "/painel", protocol,
    });

    // WhatsApp: secretaria recebe dados do agendamento
    // WhatsApp: responsável recebe confirmação com protocolo
    // Executa em paralelo e não bloqueia a resposta
    Promise.all([
      whatsappNovoAgendamento({
        protocol, service, date, slot, responsible,
        student: student ? (typeof student === "string" ? JSON.parse(student) : student) : null,
      }),
      whatsappConfirmacaoResponsavel({ protocol, service, date, slot, responsible }),
    ]).catch(err => console.error("WhatsApp erro:", err));

    return res.status(201).json({ ok: true, agendamento: rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Protocolo duplicado." });
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

router.get("/slots", async (req, res) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ error: "Parâmetro data obrigatório." });
  try {
    const { rows } = await pool.query(
      `SELECT slot FROM agendamentos WHERE date=$1 AND slot IS NOT NULL AND status IN ('pendente','confirmado')`,
      [data]
    );
    return res.json({ data, ocupados: rows.map(r => r.slot) });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

router.get("/estatisticas", verificarToken, async (req, res) => {
  try {
    const { rows: totais } = await pool.query(`
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='pendente')   AS pendentes,
        COUNT(*) FILTER (WHERE status='confirmado') AS confirmados,
        COUNT(*) FILTER (WHERE status='concluido')  AS concluidos,
        COUNT(*) FILTER (WHERE status='cancelado')  AS cancelados
      FROM agendamentos
    `);
    const { rows: porDia } = await pool.query(`
      SELECT TO_CHAR(criado_em AT TIME ZONE 'America/Sao_Paulo','DD/MM') AS dia,
             TO_CHAR(criado_em AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS data_iso,
             COUNT(*) AS total
      FROM agendamentos WHERE criado_em >= NOW() - INTERVAL '30 days'
      GROUP BY dia,data_iso ORDER BY data_iso ASC
    `);
    const { rows: porServico } = await pool.query(`
      SELECT service, COUNT(*) AS total FROM agendamentos
      GROUP BY service ORDER BY total DESC
    `);
    const { rows: porHorario } = await pool.query(`
      SELECT slot, COUNT(*) AS total FROM agendamentos
      WHERE slot IS NOT NULL GROUP BY slot ORDER BY total DESC LIMIT 6
    `);
    const { rows: taxa } = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE status='concluido') AS concluidos,
             COUNT(*) FILTER (WHERE status IN ('concluido','cancelado')) AS finalizados
      FROM agendamentos
    `);
    const { rows: semanas } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE criado_em >= DATE_TRUNC('week',NOW())) AS semana_atual,
        COUNT(*) FILTER (WHERE criado_em >= DATE_TRUNC('week',NOW())-INTERVAL '7 days'
                           AND criado_em < DATE_TRUNC('week',NOW())) AS semana_anterior
      FROM agendamentos
    `);
    return res.json({
      totais: totais[0],
      porDia,
      porServico: porServico.map(r => ({
        service: r.service, label: SERVICE_LABELS[r.service]||r.service, total: parseInt(r.total)
      })),
      porHorario,
      taxa: taxa[0],
      semanas: semanas[0],
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

router.get("/", verificarToken, async (req, res) => {
  const { data, status } = req.query;
  let query = "SELECT * FROM agendamentos WHERE 1=1";
  const params = [];
  if (data)   { params.push(data);   query += ` AND date=$${params.length}`; }
  if (status) { params.push(status); query += ` AND status=$${params.length}`; }
  query += " ORDER BY criado_em DESC LIMIT 100";
  try {
    const { rows } = await pool.query(query, params);
    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

router.patch("/:id/status", verificarToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["pendente","confirmado","cancelado","concluido"].includes(status))
    return res.status(400).json({ error: "Status inválido." });
  try {
    const { rows } = await pool.query(
      `UPDATE agendamentos SET status=$1,atualizado_em=NOW() WHERE id=$2 RETURNING *`,
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: "Não encontrado." });

    // WhatsApp: secretaria recebe notificação de status atualizado
    const ag = rows[0];
    const responsible = typeof ag.responsible === "string"
      ? JSON.parse(ag.responsible) : ag.responsible;
    const student = ag.student
      ? (typeof ag.student === "string" ? JSON.parse(ag.student) : ag.student) : null;

    whatsappStatusAtualizado({
      protocol: ag.protocol,
      service:  ag.service,
      status,
      responsible,
      student,
    }).catch(err => console.error("WhatsApp status erro:", err));

    return res.json({ ok: true, agendamento: rows[0] });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});
