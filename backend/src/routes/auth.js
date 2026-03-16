import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

export const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "secretaria-sem-fila-secret-2026";
const JWT_EXPIRES = "8h";

// ── Login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha)
    return res.status(400).json({ error: "Usuário e senha são obrigatórios." });

  try {
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE usuario = $1",
      [usuario.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: "Usuário ou senha incorretos." });

    const user = rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaOk) return res.status(401).json({ error: "Usuário ou senha incorretos." });

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, nome: user.nome, perfil: user.perfil },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    return res.json({ ok: true, token, nome: user.nome, perfil: user.perfil });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// ── Trocar própria senha ───────────────────────────────────────
router.patch("/senha", verificarToken, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  if (!senhaAtual || !novaSenha)
    return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias." });
  if (novaSenha.length < 6)
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });

  try {
    const { rows } = await pool.query("SELECT * FROM usuarios WHERE id=$1", [req.user.id]);
    const senhaOk = await bcrypt.compare(senhaAtual, rows[0].senha_hash);
    if (!senhaOk) return res.status(401).json({ error: "Senha atual incorreta." });

    const novoHash = await bcrypt.hash(novaSenha, 10);
    await pool.query("UPDATE usuarios SET senha_hash=$1 WHERE id=$2", [novoHash, req.user.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// ── Listar usuários (admin) ────────────────────────────────────
router.get("/usuarios", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, usuario, nome, perfil, criado_em FROM usuarios ORDER BY criado_em ASC"
    );
    return res.json(rows);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// ── Criar usuário (admin) ─────────────────────────────────────
router.post("/usuarios", verificarToken, verificarAdmin, async (req, res) => {
  const { usuario, nome, senha, perfil } = req.body;
  if (!usuario || !nome || !senha)
    return res.status(400).json({ error: "Usuário, nome e senha são obrigatórios." });
  if (senha.length < 6)
    return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres." });
  const perfilValido = ["admin","funcionario"].includes(perfil) ? perfil : "funcionario";

  try {
    const hash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      "INSERT INTO usuarios (usuario, nome, senha_hash, perfil) VALUES ($1,$2,$3,$4) RETURNING id,usuario,nome,perfil,criado_em",
      [usuario.toLowerCase().trim(), nome.trim(), hash, perfilValido]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Usuário já existe." });
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// ── Redefinir senha de outro usuário (admin) ──────────────────
router.patch("/usuarios/:id/senha", verificarToken, verificarAdmin, async (req, res) => {
  const { novaSenha } = req.body;
  if (!novaSenha || novaSenha.length < 6)
    return res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres." });

  try {
    const hash = await bcrypt.hash(novaSenha, 10);
    const { rows } = await pool.query(
      "UPDATE usuarios SET senha_hash=$1 WHERE id=$2 RETURNING id",
      [hash, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado." });
    return res.json({ ok: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// ── Excluir usuário (admin, não pode excluir a si mesmo) ──────
router.delete("/usuarios/:id", verificarToken, verificarAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: "Você não pode excluir seu próprio usuário." });
  try {
    const { rows } = await pool.query(
      "DELETE FROM usuarios WHERE id=$1 RETURNING id", [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado." });
    return res.json({ ok: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Erro interno." }); }
});

// ── Middlewares ───────────────────────────────────────────────
export function verificarToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "Acesso negado. Faça login." });
  try {
    req.user = jwt.verify(auth.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  }
}

export function verificarAdmin(req, res, next) {
  if (req.user?.perfil !== "admin")
    return res.status(403).json({ error: "Permissão negada. Apenas administradores." });
  next();
}
