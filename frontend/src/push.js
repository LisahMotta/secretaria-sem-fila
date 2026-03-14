const API = import.meta.env.VITE_API_URL || "/api";

export async function registrarPushSecretaria() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push não suportado neste navegador.");
    return false;
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    console.warn("Permissão de notificação negada.");
    return false;
  }

  const sw = await navigator.serviceWorker.ready;

  // Busca chave pública VAPID do backend
  const res = await fetch(`${API}/push/vapid-public-key`);
  const { publicKey } = await res.json();

  const subscription = await sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const subJson = subscription.toJSON();

  await fetch(`${API}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      keys: subJson.keys,
      tipo: "secretaria",
    }),
  });

  console.log("Push registrado com sucesso.");
  return true;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
