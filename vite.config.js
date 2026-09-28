import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Habilita o service worker também em `npm run dev`
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Teste PWA - Site React',
        short_name: 'Teste PWA',
        description: 'Aplicação React mínima para testar recursos de PWA.',
        lang: 'pt-BR',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['sw-custom.js'],
        // Anexa os handlers de notificação ao SW gerado pelo Workbox.
        importScripts: ['sw-custom.js'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
