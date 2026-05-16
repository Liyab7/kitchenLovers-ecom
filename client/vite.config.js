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
      includeAssets: ['brand/logo.jpg', 'robots.txt'],
      manifest: {
        name: 'KitchenLovers Cookwares',
        short_name: 'KitchenLovers',
        description: 'Kitchen products for people who love to cook — by Aba Dope',
        theme_color: '#FF6B35',
        background_color: '#FFF8F3',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/brand/logo.jpg', sizes: '512x512', type: 'image/jpeg' },
          { src: '/brand/logo.jpg', sizes: '192x192', type: 'image/jpeg' },
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
