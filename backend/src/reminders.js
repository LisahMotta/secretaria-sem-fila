import { pool } from "./db.js";
import { whatsappLembrete24h, whatsappLembrete1h } from "./whatsapp.js";

async function verificarLembretes() {
  const client = await pool.connect();
  try {
    // Lembretes de 24h: agendamentos de amanhã com data e slot, pendente/confirmado, não enviado
    const { rows: rows24h } = await client.query(`
      SELECT * FROM agendamentos
      WHERE status IN ('pendente','confirmado')
        AND date IS NOT NULL
        AND slot IS NOT NULL
        AND lembrete_24h = FALSE
        AND (date::date + slot::time) BETWEEN
          NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '23 hours'
          AND NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '26 hours'
    `);

    for (const ag of rows24h) {
      const responsible = typeof ag.responsible === "string"
        ? JSON.parse(ag.responsible) : ag.responsible;
      await whatsappLembrete24h({
        protocol: ag.protocol,
        service:  ag.service,
        date:     ag.date,
        slot:     ag.slot,
        responsible,
        cancelToken: ag.cancel_token,
      }).catch(err => console.error("Lembrete 24h erro:", err));
      await client.query(
        "UPDATE agendamentos SET lembrete_24h=TRUE WHERE id=$1",
        [ag.id]
      );
    }

    // Lembretes de 1h: agendamentos de daqui a 1h, pendente/confirmado, não enviado
    const { rows: rows1h } = await client.query(`
      SELECT * FROM agendamentos
      WHERE status IN ('pendente','confirmado')
        AND date IS NOT NULL
        AND slot IS NOT NULL
        AND lembrete_1h = FALSE
        AND (date::date + slot::time) BETWEEN
          NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '50 minutes'
          AND NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '75 minutes'
    `);

    for (const ag of rows1h) {
      const responsible = typeof ag.responsible === "string"
        ? JSON.parse(ag.responsible) : ag.responsible;
      await whatsappLembrete1h({
        protocol: ag.protocol,
        service:  ag.service,
        date:     ag.date,
        slot:     ag.slot,
        responsible,
      }).catch(err => console.error("Lembrete 1h erro:", err));
      await client.query(
        "UPDATE agendamentos SET lembrete_1h=TRUE WHERE id=$1",
        [ag.id]
      );
    }

    if (rows24h.length || rows1h.length) {
      console.log(`Lembretes enviados — 24h: ${rows24h.length}, 1h: ${rows1h.length}`);
    }
  } catch (err) {
    console.error("Erro ao verificar lembretes:", err);
  } finally {
    client.release();
  }
}

export function iniciarLembretes() {
  verificarLembretes().catch(console.error);
  setInterval(() => verificarLembretes().catch(console.error), 5 * 60 * 1000);
  console.log("Scheduler de lembretes iniciado (intervalo: 5 min).");
}
