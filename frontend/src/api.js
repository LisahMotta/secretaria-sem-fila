import { fetchAuth } from "./auth.js";

const BASE = import.meta.env.VITE_API_URL || "/api";

export async function criarAgendamento(payload) {
  const res = await fetch(`${BASE}/agendamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao salvar agendamento.");
  }
  return res.json();
}

export async function listarAgendamentos({ data, status, service } = {}) {
  const params = new URLSearchParams();
  if (data)    params.set("data", data);
  if (status)  params.set("status", status);
  if (service) params.set("service", service);
  const res = await fetchAuth(`${BASE}/agendamentos?${params}`);
  if (!res.ok) throw new Error("Erro ao carregar agendamentos.");
  return res.json();
}

export async function buscarEstatisticas() {
  const res = await fetchAuth(`${BASE}/agendamentos/estatisticas`);
  if (!res.ok) throw new Error("Erro ao carregar estatísticas.");
  return res.json();
}

export async function buscarSlotsOcupados(data) {
  const res = await fetch(`${BASE}/agendamentos/slots?data=${data}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.ocupados || [];
}

export async function atualizarStatus(id, status) {
  const res = await fetchAuth(`${BASE}/agendamentos/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Erro ao atualizar status.");
  return res.json();
}

// ── Consulta pública por protocolo ───────────────────────────
export async function consultarProtocolo(protocol) {
  const res = await fetch(`${BASE}/agendamentos/consultar/${encodeURIComponent(protocol)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Protocolo não encontrado.");
  }
  return res.json();
}

// ── Cancelar via token ────────────────────────────────────────
export async function buscarInfoCancelamento(token) {
  const res = await fetch(`${BASE}/agendamentos/cancelar/${token}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Link inválido.");
  }
  return res.json();
}

export async function confirmarCancelamento(token) {
  const res = await fetch(`${BASE}/agendamentos/cancelar/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao cancelar.");
  }
  return res.json();
}

// ── Reagendar via token ───────────────────────────────────────
export async function buscarInfoReagendamento(token) {
  const res = await fetch(`${BASE}/agendamentos/reagendar/${token}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Link inválido.");
  }
  return res.json();
}

export async function confirmarReagendamento(token, date, slot) {
  const res = await fetch(`${BASE}/agendamentos/reagendar/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, slot }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao reagendar.");
  }
  return res.json();
}
