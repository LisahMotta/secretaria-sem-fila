import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";

// Registra o Service Worker — necessário para PWA funcionar
registerSW({
  onNeedRefresh() {
    // Nova versão disponível — atualiza silenciosamente
    console.log("Nova versão disponível, atualizando...");
  },
  onOfflineReady() {
    console.log("App pronto para uso offline!");
  },
  immediate: true,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
