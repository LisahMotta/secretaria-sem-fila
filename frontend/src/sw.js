import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", event => {
  const data = event.data?.json() ?? {
    title: "Novo agendamento",
    body: "Um responsável acabou de agendar.",
    icon: "/icons/icon-192.png",
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
      data: { url: data.url || "/painel" },
      tag: "agendamento-" + Date.now(),
      requireInteraction: true,
      actions: [
        { action: "ver", title: "Ver no painel" },
        { action: "fechar", title: "Fechar" },
      ],
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "fechar") return;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const url = event.notification.data?.url || "/painel";
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
