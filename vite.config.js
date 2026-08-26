import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { port: 5193, strictPort: true },
  preview: { port: 5193, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: 'WIMP Game — Koło Fortuny',
        short_name: 'WIMP Game',
        description: 'Domowe koło fortuny — zgadujcie hasła ze znajomymi na TV i telefonach',
        lang: 'pl',
        start_url: '/',
        display: 'standalone',
        background_color: '#150b2e',
        theme_color: '#150b2e',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
