import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

export const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "secretaria-sem-fila-secret-2026";
const JWT_EXPIRES = "8h"; // token válido por 8 horas (um turno escolar)

// ── Login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  if (!usuario || !senha) {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE usuario = $1",
      [usuario.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Usuário ou senha incorretos." });
    }

    const user = rows[0];
    const senhaOk = await bcrypt.compare(senha, user.senha_hash);

    if (!senhaOk) {
      return res.status(401).json({ error: "Usuário ou senha incorretos." });
    }

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, nome: user.nome },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({ ok: true, token, nome: user.nome });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// ── Trocar senha ──────────────────────────────────────────────
router.patch("/senha", verificarToken, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias." });
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [req.user.id]
    );

    const senhaOk = await bcrypt.compare(senhaAtual, rows[0].senha_hash);
    if (!senhaOk) {
      return res.status(401).json({ error: "Senha atual incorreta." });
    }

    const novoHash = await bcrypt.hash(novaSenha, 10);
    await pool.query(
      "UPDATE usuarios SET senha_hash = $1 WHERE id = $2",
      [novoHash, req.user.id]
    );

    return res.json({ ok: true, message: "Senha atualizada com sucesso." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// ── Middleware de verificação JWT ─────────────────────────────
export function verificarToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Acesso negado. Faça login." });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  }
}
