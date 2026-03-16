import { Router } from "express";
import crypto from "crypto";
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

const SLOTS = ["08:00","08:30","09:00","09:30","10:00","10:30","13:00","13:30","14:00","14:30","15:00","15:30"];

// ── Criar agendamento ─────────────────────────────────────────
router.post("/", async (req, res) => {
  const { protocol, service, date, slot, responsible, student,
          doc_types, outros, historico, passe } = req.body;
  if (!protocol || !service || !responsible?.name || !responsible?.phone)
    return res.status(400).json({ error: "Dados obrigatórios ausentes." });

  const cancelToken = crypto.randomBytes(20).toString("hex");

  try {
    const { rows } = await pool.query(
      `INSERT INTO agendamentos
         (protocol,service,date,slot,responsible,student,doc_types,outros,historico,passe,cancel_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [protocol, service, date||null, slot||null,
       JSON.stringify(responsible),
       student   ? JSON.stringify(student)   : null,
       doc_types ? JSON.stringify(doc_types) : null,
       outros    ? JSON.stringify(outros)    : null,
       historico ? JSON.stringify(historico) : null,
       passe     ? JSON.stringify(passe)     : null,
       cancelToken]
    );
    await enviarPushSecretaria({
      title: "Novo agendamento — " + (SERVICE_LABELS[service] || service),
      body: `${responsible.name} · ${date ? date+(slot?" às "+slot:"") : "Sem data"}`,
      url: "/painel", protocol,
    });

    Promise.all([
      whatsappNovoAgendamento({
        protocol, service, date, slot, responsible,
        student: student ? (typeof student === "string" ? JSON.parse(student) : student) : null,
      }),
      whatsappConfirmacaoResponsavel({ protocol, service, date, slot, responsible, cancelToken }),
    ]).catch(err => console.error("WhatsApp erro:", err));

    return res.status(201).json({ ok: true, agendamento: rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Protocolo duplicado." });
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// ── Slots ocupados ────────────────────────────────────────────
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

// ── Consulta pública por protocolo ───────────────────────────
router.get("/consultar/:protocol", async (req, res) => {
  const { protocol } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT id,protocol,service,date,slot,status,responsible,student,criado_em,atualizado_em
       FROM agendamentos WHERE protocol=$1`,
      [protocol.toUpperCase()]
    );
    if (!rows.length) return res.status(404).json({ error: "Protocolo não encontrado." });
    const ag = rows[0];
    const responsible = typeof ag.responsible === "string" ? JSON.parse(ag.responsible) : ag.responsible;
    const student = ag.student ? (typeof ag.student === "string" ? JSON.parse(ag.student) : ag.student) : null;
    return res.json({
      protocol: ag.protocol,
      service:  ag.service,
      serviceLabel: SERVICE_LABELS[ag.service] || ag.service,
      date:     ag.date,
      slot:     ag.slot,
      status:   ag.status,
      responsibleName: responsible?.name,
      studentName: student?.name,
      criado_em: ag.criado_em,
      atualizado_em: ag.atualizado_em,
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// ── Validar token (usado para cancelar e reagendar) ───────────
async function buscarPorToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM agendamentos WHERE cancel_token=$1`,
    [token]
  );
  return rows[0] || null;
}

// ── Cancelar via token público ────────────────────────────────
router.get("/cancelar/:token", async (req, res) => {
  try {
    const ag = await buscarPorToken(req.params.token);
    if (!ag) return res.status(404).json({ error: "Link inválido ou expirado." });
    if (ag.status === "cancelado") return res.status(409).json({ error: "Agendamento já cancelado." });
    if (ag.status === "concluido") return res.status(409).json({ error: "Agendamento já concluído, não é possível cancelar." });
    const responsible = typeof ag.responsible === "string" ? JSON.parse(ag.responsible) : ag.responsible;
    return res.json({
      protocol: ag.protocol,
      service:  ag.service,
      serviceLabel: SERVICE_LABELS[ag.service] || ag.service,
      date: ag.date,
      slot: ag.slot,
      status: ag.status,
      responsibleName: responsible?.name,
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

router.post("/cancelar/:token", async (req, res) => {
  try {
    const ag = await buscarPorToken(req.params.token);
    if (!ag) return res.status(404).json({ error: "Link inválido ou expirado." });
    if (ag.status === "cancelado") return res.status(409).json({ error: "Já cancelado." });
    if (ag.status === "concluido") return res.status(409).json({ error: "Agendamento já concluído." });

    await pool.query(
      `UPDATE agendamentos SET status='cancelado', atualizado_em=NOW() WHERE id=$1`,
      [ag.id]
    );

    const responsible = typeof ag.responsible === "string" ? JSON.parse(ag.responsible) : ag.responsible;
    const student = ag.student ? (typeof ag.student === "string" ? JSON.parse(ag.student) : ag.student) : null;

    whatsappStatusAtualizado({
      protocol: ag.protocol, service: ag.service,
      status: "cancelado", responsible, student,
    }).catch(err => console.error("WhatsApp cancelar erro:", err));

    return res.json({ ok: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// ── Reagendar via token público ───────────────────────────────
router.get("/reagendar/:token", async (req, res) => {
  try {
    const ag = await buscarPorToken(req.params.token);
    if (!ag) return res.status(404).json({ error: "Link inválido ou expirado." });
    if (ag.status === "cancelado") return res.status(409).json({ error: "Agendamento cancelado, não é possível reagendar." });
    if (ag.status === "concluido") return res.status(409).json({ error: "Agendamento já concluído." });
    const responsible = typeof ag.responsible === "string" ? JSON.parse(ag.responsible) : ag.responsible;
    return res.json({
      protocol: ag.protocol,
      service:  ag.service,
      serviceLabel: SERVICE_LABELS[ag.service] || ag.service,
      date: ag.date,
      slot: ag.slot,
      status: ag.status,
      responsibleName: responsible?.name,
      slots: SLOTS,
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

router.post("/reagendar/:token", async (req, res) => {
  const { date, slot } = req.body;
  if (!date || !slot) return res.status(400).json({ error: "Data e horário são obrigatórios." });
  if (!SLOTS.includes(slot)) return res.status(400).json({ error: "Horário inválido." });

  try {
    const ag = await buscarPorToken(req.params.token);
    if (!ag) return res.status(404).json({ error: "Link inválido ou expirado." });
    if (ag.status === "cancelado") return res.status(409).json({ error: "Agendamento cancelado." });
    if (ag.status === "concluido") return res.status(409).json({ error: "Agendamento já concluído." });

    // Verifica disponibilidade do novo slot
    const { rows: ocupados } = await pool.query(
      `SELECT id FROM agendamentos WHERE date=$1 AND slot=$2 AND status IN ('pendente','confirmado') AND id!=$3`,
      [date, slot, ag.id]
    );
    if (ocupados.length) return res.status(409).json({ error: "Horário indisponível. Escolha outro." });

    await pool.query(
      `UPDATE agendamentos SET date=$1, slot=$2, status='pendente',
        lembrete_24h=FALSE, lembrete_1h=FALSE, atualizado_em=NOW()
       WHERE id=$3`,
      [date, slot, ag.id]
    );

    const responsible = typeof ag.responsible === "string" ? JSON.parse(ag.responsible) : ag.responsible;

    whatsappConfirmacaoResponsavel({
      protocol: ag.protocol, service: ag.service,
      date, slot, responsible, cancelToken: ag.cancel_token,
    }).catch(err => console.error("WhatsApp reagendar erro:", err));

    return res.json({ ok: true, date, slot });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// ── Estatísticas ──────────────────────────────────────────────
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

// ── Listar agendamentos (secretaria) ──────────────────────────
router.get("/", verificarToken, async (req, res) => {
  const { data, status, service } = req.query;
  let query = "SELECT * FROM agendamentos WHERE 1=1";
  const params = [];
  if (data)    { params.push(data);    query += ` AND date=$${params.length}`; }
  if (status)  { params.push(status);  query += ` AND status=$${params.length}`; }
  if (service) { params.push(service); query += ` AND service=$${params.length}`; }
  query += " ORDER BY criado_em DESC LIMIT 200";
  try {
    const { rows } = await pool.query(query, params);
    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// ── Atualizar status (secretaria) ─────────────────────────────
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

    const ag = rows[0];
    const responsible = typeof ag.responsible === "string"
      ? JSON.parse(ag.responsible) : ag.responsible;
    const student = ag.student
      ? (typeof ag.student === "string" ? JSON.parse(ag.student) : ag.student) : null;

    whatsappStatusAtualizado({
      protocol: ag.protocol, service: ag.service,
      status, responsible, student,
    }).catch(err => console.error("WhatsApp status erro:", err));

    return res.json({ ok: true, agendamento: rows[0] });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});
