import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Los íconos ya están generados en public/ (pwa-icon-source.svg es el
      // origen, ver README) -- no hace falta que este plugin los regenere.
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Life Under Control',
        short_name: 'Life Under Control',
        description: 'Organiza tareas, finanzas, compras y vencimientos en un solo lugar.',
        theme_color: '#5738f2',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Sin runtimeCaching para /api: las requests al backend nunca deben
        // servirse desde cache -- los datos (tareas, finanzas, etc.) tienen que
        // ser siempre frescos. El precache de workbox solo cubre los assets
        // estáticos del build (JS/CSS/HTML), no las llamadas a la API.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: {
        // Desactivado en dev: el service worker interfiere con el hot-reload
        // de Vite y no aporta nada útil mientras se desarrolla.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      usePolling: true,
    },
  },
})
