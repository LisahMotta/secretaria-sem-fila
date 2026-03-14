import webpush from "web-push";
import { pool } from "./db.js";
import dotenv from "dotenv";
dotenv.config();

webpush.setVapidDetails(
  "mailto:" + (process.env.VAPID_EMAIL || "secretaria@escola.sp.gov.br"),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function enviarPushSecretaria(payload) {
  const { rows } = await pool.query(
    "SELECT * FROM push_subscriptions WHERE tipo = 'secretaria'"
  );

  if (!rows.length) return;

  const notificacao = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    url: payload.url || "/painel",
    protocol: payload.protocol,
  });

  const resultados = await Promise.allSettled(
    rows.map(row =>
      webpush.sendNotification(
        { endpoint: row.endpoint, keys: row.keys },
        notificacao
      ).catch(async err => {
        // Se o endpoint não existe mais, remove do banco
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query(
            "DELETE FROM push_subscriptions WHERE endpoint = $1",
            [row.endpoint]
          );
        }
        throw err;
      })
    )
  );

  const enviados = resultados.filter(r => r.status === "fulfilled").length;
  const falhas   = resultados.filter(r => r.status === "rejected").length;
  console.log(`Push enviado: ${enviados} ok, ${falhas} falhas`);
}
