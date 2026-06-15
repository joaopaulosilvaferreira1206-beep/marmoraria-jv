import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/* global process */
import { readFileSync } from 'fs'
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

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
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // React core — carrega primeiro, cacheado por muito tempo
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'vendor-react'
            }
            // Supabase — conexão com o banco
            if (id.includes('node_modules/@supabase') || id.includes('node_modules/idb')) {
              return 'vendor-supabase'
            }
            // PDF — carregado só quando o usuário exporta
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/jspdf-autotable') || id.includes('node_modules/html2canvas')) {
              return 'vendor-pdf'
            }
            // Excel — carregado só quando o usuário exporta
            if (id.includes('node_modules/xlsx')) {
              return 'vendor-xlsx'
            }
            // Ícones
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons'
            }
          },
        },
      },
    },
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
