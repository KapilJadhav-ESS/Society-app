import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' lets the same build run from a domain root or a sub-path
// (e.g. GitHub Pages at /Society-app/). Routing uses HashRouter.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'sw-push.js'],
      manifest: {
        name: 'Smart Society',
        short_name: 'Smart Society',
        description: 'Apartment community management – payments, complaints, visitors, bookings and more.',
        theme_color: '#13254A',
        background_color: '#F7F8FA',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        importScripts: ['sw-push.js']
      }
    })
  ]
})
