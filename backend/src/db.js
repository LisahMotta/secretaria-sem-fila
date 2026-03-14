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
        criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id        SERIAL PRIMARY KEY,
        endpoint  TEXT UNIQUE NOT NULL,
        keys      JSONB NOT NULL,
        tipo      TEXT NOT NULL DEFAULT 'secretaria',
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Banco de dados inicializado.");
  } finally {
    client.release();
  }
}
