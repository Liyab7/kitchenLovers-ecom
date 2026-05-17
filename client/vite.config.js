import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,jpg,png,webp,ico,woff2}'],
      },
      injectRegister: 'auto',
      includeAssets: ['brand/logo.jpg', 'brand/icon-192.png', 'brand/icon-512.png', 'brand/icon-maskable-512.png', 'robots.txt'],
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'KitchenLovers Cookwares',
        short_name: 'KitchenLovers',
        description: 'Kitchen products for people who love to cook — by Aba Dope',
        theme_color: '#FF6B35',
        background_color: '#FFF8F3',
        display: 'standalone',
        // Older browsers (Samsung Internet, some Android Chrome variants) fall through
        // this list and pick the first display mode they understand.
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['shopping', 'lifestyle'],
        prefer_related_applications: false,
        icons: [
          { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
