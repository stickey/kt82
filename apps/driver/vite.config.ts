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
        name: 'KT82 Driver',
        short_name: 'KT82 Driver',
        theme_color: '#13110a',
        background_color: '#13110a',
        display: 'standalone',
        start_url: '/driver/',
        scope: '/driver/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  base: '/driver',
  server: { port: 5176, proxy: { '/api': 'http://localhost:3001' } },
})
