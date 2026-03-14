const BASE = import.meta.env.VITE_API_URL || "/api";

// ── Token (salvo no sessionStorage — apagado ao fechar o navegador) ──
export function getToken() {
  return sessionStorage.getItem("ssf_token");
}

export function setToken(token) {
  sessionStorage.setItem("ssf_token", token);
}

export function removeToken() {
  sessionStorage.removeItem("ssf_token");
  sessionStorage.removeItem("ssf_nome");
}

export function getNome() {
  return sessionStorage.getItem("ssf_nome") || "Secretaria";
}

export function estaLogado() {
  return !!getToken();
}

// ── Login ────────────────────────────────────────────────────
export async function login(usuario, senha) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, senha }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Erro ao fazer login.");

  setToken(data.token);
  sessionStorage.setItem("ssf_nome", data.nome);
  return data;
}

// ── Trocar senha ─────────────────────────────────────────────
export async function trocarSenha(senhaAtual, novaSenha) {
  const res = await fetch(`${BASE}/auth/senha`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao trocar senha.");
  return data;
}

// ── Fetch autenticado (helper para outras requisições) ───────
export async function fetchAuth(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    removeToken();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return res;
}
