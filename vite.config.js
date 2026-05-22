import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ARESO — Gestión de equipo',
        short_name: 'ARESO',
        theme_color: '#2d5be3',
        background_color: '#f5f6fa',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/areso-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/areso-icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})