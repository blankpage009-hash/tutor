import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages는 https://<계정>.github.io/tutor/ 처럼 하위 경로에서 열리므로 base를 맞춘다.
export default defineConfig({
  base: '/tutor/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Tutor',
        short_name: 'Tutor',
        description: '영어 문장 쉐도잉 · 반복 학습',
        lang: 'ko',
        start_url: '/tutor/',
        scope: '/tutor/',
        display: 'standalone',
        background_color: '#f4f5f8',
        theme_color: '#f4f5f8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  test: { environment: 'node' }
});
