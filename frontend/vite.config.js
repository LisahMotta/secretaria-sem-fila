import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Usa generateSW (mais simples e confiável para PWA)
      strategies: "generateSW",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Secretaria Sem Fila",
        short_name: "Sec. Sem Fila",
        description: "Agendamento online da secretaria escolar — SEDUC-SP",
        theme_color: "#1B3A6B",
        background_color: "#F4F7FB",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "pt-BR",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
