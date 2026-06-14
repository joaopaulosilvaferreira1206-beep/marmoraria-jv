import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/* global process */
export default defineConfig(() => {
  const isElectron = process.env.BUILD_TARGET === 'electron'

  return {
    base: isElectron ? './' : '/',
    plugins: [
      react(),
      !isElectron && VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          navigateFallback: null,
        },
        manifest: {
          name: 'Marmoraria JV',
          short_name: 'Marmoraria JV',
          description: 'Sistema de gestão da Marmoraria JV',
          theme_color: '#1f2937',
          background_color: '#111827',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/?source=pwa',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ]
        }
      })
    ].filter(Boolean),
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'dist/', 'android/', 'electron/', 'src/test/'],
      },
    },
  }
})
