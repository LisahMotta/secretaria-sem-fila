import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id          SERIAL PRIMARY KEY,
        protocol    TEXT UNIQUE NOT NULL,
        service     TEXT NOT NULL,
        date        DATE,
        slot        TEXT,
        status      TEXT NOT NULL DEFAULT 'pendente',
        responsible JSONB NOT NULL,
        student     JSONB,
        doc_types   JSONB,
        outros      JSONB,
        historico   JSONB,
        passe       JSONB,
        cancel_token  TEXT UNIQUE,
        lembrete_24h  BOOLEAN NOT NULL DEFAULT FALSE,
        lembrete_1h   BOOLEAN NOT NULL DEFAULT FALSE,
        criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS cancel_token TEXT UNIQUE;
      ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lembrete_24h BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lembrete_1h  BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id        SERIAL PRIMARY KEY,
        endpoint  TEXT UNIQUE NOT NULL,
        keys      JSONB NOT NULL,
        tipo      TEXT NOT NULL DEFAULT 'secretaria',
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id         SERIAL PRIMARY KEY,
        usuario    TEXT UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL,
        nome       TEXT NOT NULL,
        criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Cria usuário padrão se não existir nenhum
    const { rows } = await client.query("SELECT COUNT(*) FROM usuarios");
    if (parseInt(rows[0].count) === 0) {
      const bcrypt = await import("bcryptjs");
      const senhaInicial = process.env.ADMIN_PASSWORD || "secretaria123";
      const hash = await bcrypt.default.hash(senhaInicial, 10);
      await client.query(
        "INSERT INTO usuarios (usuario, senha_hash, nome) VALUES ($1, $2, $3)",
        ["secretaria", hash, "Secretaria"]
      );
      console.log("Usuário padrão criado: secretaria / " + senhaInicial);
    }

    console.log("Banco de dados inicializado.");
  } finally {
    client.release();
  }
}
