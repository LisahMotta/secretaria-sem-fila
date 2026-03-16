import { fetchAuth, getToken } from "./auth.js";

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
  if (!res.ok) return { ocupados: [], diaBloqueado: false };
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

// ── Notas internas ────────────────────────────────────────────
export async function adicionarNota(id, texto) {
  const res = await fetchAuth(`${BASE}/agendamentos/${id}/notas`, {
    method: "POST",
    body: JSON.stringify({ texto }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao salvar nota.");
  }
  return res.json();
}

// ── Histórico de ações ────────────────────────────────────────
export async function buscarHistorico(id) {
  const res = await fetchAuth(`${BASE}/agendamentos/${id}/historico`);
  if (!res.ok) throw new Error("Erro ao carregar histórico.");
  return res.json();
}

// ── Exportar CSV ──────────────────────────────────────────────
export function urlExportarCSV({ data_inicio, data_fim, service, status } = {}) {
  const params = new URLSearchParams();
  if (data_inicio) params.set("data_inicio", data_inicio);
  if (data_fim)    params.set("data_fim", data_fim);
  if (service)     params.set("service", service);
  if (status)      params.set("status", status);
  return `${BASE}/agendamentos/exportar?${params}`;
}

export async function exportarCSV(filtros = {}) {
  const res = await fetchAuth(urlExportarCSV(filtros));
  if (!res.ok) throw new Error("Erro ao exportar.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agendamentos-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

// ── Verificar protocolo + telefone (obtém token para ações) ──
export async function verificarAgendamento(protocol, phone) {
  const res = await fetch(`${BASE}/agendamentos/verificar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ protocol, phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao verificar.");
  }
  return res.json(); // { cancelToken }
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

// ── Avaliação de atendimento ──────────────────────────────────
export async function registrarAvaliacao(id, avaliacao) {
  const res = await fetchAuth(`${BASE}/agendamentos/${id}/avaliacao`, {
    method: "PATCH",
    body: JSON.stringify({ avaliacao }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao salvar avaliação.");
  }
  return res.json();
}

// ── Relatório de faltas ───────────────────────────────────────
export async function buscarFaltas({ data_inicio, data_fim, service } = {}) {
  const params = new URLSearchParams();
  if (data_inicio) params.set("data_inicio", data_inicio);
  if (data_fim)    params.set("data_fim", data_fim);
  if (service)     params.set("service", service);
  const res = await fetchAuth(`${BASE}/agendamentos/relatorio/faltas?${params}`);
  if (!res.ok) throw new Error("Erro ao carregar relatório de faltas.");
  return res.json();
}

// ── Bloqueios ─────────────────────────────────────────────────
export async function listarBloqueios() {
  const res = await fetchAuth(`${BASE}/bloqueios`);
  if (!res.ok) throw new Error("Erro ao carregar bloqueios.");
  return res.json();
}

export async function criarBloqueio({ date, slot, motivo }) {
  const res = await fetchAuth(`${BASE}/bloqueios`, {
    method: "POST",
    body: JSON.stringify({ date, slot: slot || null, motivo }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao criar bloqueio.");
  }
  return res.json();
}

export async function excluirBloqueio(id) {
  const res = await fetchAuth(`${BASE}/bloqueios/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erro ao excluir bloqueio.");
  return res.json();
}

// ── Gerenciar usuários (admin) ────────────────────────────────
export async function listarUsuarios() {
  const res = await fetchAuth(`${BASE}/auth/usuarios`);
  if (!res.ok) throw new Error("Erro ao carregar usuários.");
  return res.json();
}

export async function criarUsuario({ usuario, nome, senha, perfil }) {
  const res = await fetchAuth(`${BASE}/auth/usuarios`, {
    method: "POST",
    body: JSON.stringify({ usuario, nome, senha, perfil }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao criar usuário.");
  }
  return res.json();
}

export async function redefinirSenhaUsuario(id, novaSenha) {
  const res = await fetchAuth(`${BASE}/auth/usuarios/${id}/senha`, {
    method: "PATCH",
    body: JSON.stringify({ novaSenha }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao redefinir senha.");
  }
  return res.json();
}

export async function excluirUsuario(id) {
  const res = await fetchAuth(`${BASE}/auth/usuarios/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao excluir usuário.");
  }
  return res.json();
}
