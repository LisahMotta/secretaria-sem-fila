import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router as agendamentosRouter } from "./routes/agendamentos.js";
import { router as pushRouter } from "./routes/push.js";
import { router as authRouter } from "./routes/auth.js";
import { initDB } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/agendamentos", agendamentosRouter);
app.use("/api/push", pushRouter);

initDB().then(() => {
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
}).catch(err => {
  console.error("Erro ao conectar no banco:", err);
  process.exit(1);
});
