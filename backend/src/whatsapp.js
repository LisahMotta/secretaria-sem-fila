import dotenv from "dotenv";
dotenv.config();

const ZAPI_INSTANCE  = process.env.ZAPI_INSTANCE_ID;
const ZAPI_TOKEN     = process.env.ZAPI_TOKEN;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
const BASE_URL       = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}`;

const SERVICE_LABELS = {
  historico:  "Histórico Escolar",
  declaracao: "Declaração de Matrícula",
  passe:      "Passe Escolar",
  documentos: "Entrega de Documentos",
  outros:     "Outros Atendimentos",
};

// Formata número para padrão Z-API: apenas dígitos com DDI
function formatarTelefone(tel) {
  const digits = tel.replace(/\D/g, "");
  // Se já tem DDI 55, usa direto; senão adiciona
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return "55" + digits;
}

async function enviarMensagem(telefone, mensagem) {
  if (!ZAPI_INSTANCE || !ZAPI_TOKEN) {
    console.warn("Z-API não configurada — mensagem não enviada.");
    return false;
  }

  const numero = formatarTelefone(telefone);

  try {
    const res = await fetch(`${BASE_URL}/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": ZAPI_CLIENT_TOKEN || "",
      },
      body: JSON.stringify({ phone: numero, message: mensagem }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Z-API erro:", data);
      return false;
    }

    console.log(`WhatsApp enviado para ${numero}:`, data.zaapId || "ok");
    return true;
  } catch (err) {
    console.error("Erro ao enviar WhatsApp:", err.message);
    return false;
  }
}

// ── 1. Secretaria recebe novo agendamento ─────────────────────
export async function whatsappNovoAgendamento({ protocol, service, date, slot,
  responsible, student }) {
  const telefoneSecretaria = process.env.WHATSAPP_SECRETARIA;
  if (!telefoneSecretaria) return;

  const serviceLabel = SERVICE_LABELS[service] || service;
  const dataHora = date
    ? `📅 *${date}*${slot ? ` às *${slot}*` : ""}`
    : "📅 *Sem data definida* (secretaria entrará em contato)";

  const msg = [
    "🏫 *SECRETARIA SEM FILA — Novo Agendamento*",
    "",
    `📋 *Serviço:* ${serviceLabel}`,
    dataHora,
    `👤 *Responsável:* ${responsible.name}`,
    `📱 *Telefone:* ${responsible.phone}`,
    student ? `🎒 *Aluno:* ${student.name} — ${student.grade}` : null,
    responsible.obs ? `💬 *Obs:* ${responsible.obs}` : null,
    "",
    `🔖 *Protocolo:* ${protocol}`,
    "",
    "_Acesse o painel para confirmar ou cancelar._",
  ].filter(Boolean).join("\n");

  await enviarMensagem(telefoneSecretaria, msg);
}

// ── 2. Responsável recebe confirmação com protocolo ───────────
export async function whatsappConfirmacaoResponsavel({ protocol, service,
  date, slot, responsible }) {
  if (!responsible?.phone) return;

  const serviceLabel = SERVICE_LABELS[service] || service;
  const dataHora = date
    ? `📅 *${date}*${slot ? ` às *${slot}*` : ""}`
    : "📅 A secretaria entrará em contato para confirmar data e horário.";

  const msg = [
    "✅ *Agendamento confirmado!*",
    "",
    `Olá, *${responsible.name}*!`,
    "Seu agendamento na secretaria escolar foi registrado com sucesso.",
    "",
    `📋 *Serviço:* ${serviceLabel}`,
    dataHora,
    "",
    `🔖 *Protocolo:* *${protocol}*`,
    "_Guarde este número para o dia do atendimento._",
    "",
    date
      ? "⏰ Chegue com 5 minutos de antecedência e apresente o protocolo."
      : "📞 A secretaria entrará em contato pelo seu telefone.",
    "",
    "_Secretaria Sem Fila — SEDUC-SP_",
  ].filter(Boolean).join("\n");

  await enviarMensagem(responsible.phone, msg);
}

// ── 3. Secretaria recebe ao confirmar ou cancelar ─────────────
export async function whatsappStatusAtualizado({ protocol, service,
  status, responsible, student }) {
  const telefoneSecretaria = process.env.WHATSAPP_SECRETARIA;
  if (!telefoneSecretaria) return;

  const serviceLabel = SERVICE_LABELS[service] || service;
  const statusLabel = {
    confirmado: "✅ Confirmado",
    cancelado:  "❌ Cancelado",
    concluido:  "🏁 Concluído",
  }[status] || status;

  const msg = [
    `📋 *SECRETARIA SEM FILA — Status Atualizado*`,
    "",
    `*Status:* ${statusLabel}`,
    `*Serviço:* ${serviceLabel}`,
    `*Responsável:* ${responsible?.name || "—"}`,
    `*Telefone:* ${responsible?.phone || "—"}`,
    student ? `*Aluno:* ${student?.name || "—"}` : null,
    "",
    `🔖 *Protocolo:* ${protocol}`,
  ].filter(Boolean).join("\n");

  await enviarMensagem(telefoneSecretaria, msg);
}
