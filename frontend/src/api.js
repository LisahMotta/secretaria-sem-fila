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

export async function listarAgendamentos({ data, status } = {}) {
  const params = new URLSearchParams();
  if (data)   params.set("data", data);
  if (status) params.set("status", status);
  const res = await fetchAuth(`${BASE}/agendamentos?${params}`);
  if (!res.ok) throw new Error("Erro ao carregar agendamentos.");
  return res.json();
}

export async function atualizarStatus(id, status) {
  const res = await fetchAuth(`${BASE}/agendamentos/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Erro ao atualizar status.");
  return res.json();
}
