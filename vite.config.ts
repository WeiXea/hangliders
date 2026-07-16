import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'HangGlider',
        short_name: 'HangGlider',
        description: 'Immersive hang gliding simulator — beach, mountains, city',
        theme_color: '#1a3a5c',
        background_color: '#87b8e8',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          {
            src: '/icons.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Include Kenney GLBs so the city isn't blank on cached PWA loads
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,glb,hdr,jpg}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
})
