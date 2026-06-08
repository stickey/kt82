import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/favicon.svg'],
      },
      manifest: {
        name: 'KT82 Tracker',
        short_name: 'KT82 Tracker',
        theme_color: '#13110a',
        background_color: '#13110a',
        display: 'standalone',
        start_url: '/tracker/',
        scope: '/tracker/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  base: '/tracker',
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
})
