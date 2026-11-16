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
      workbox: {
        // 문장 JSON(약 1.3MB)은 설치 때 미리 받는다. 음성(약 43MB)은 미리 받지 않고
        // 재생할 때 앱 코드(src/speech/audioCache.ts)가 직접 받아 보관한다.
        // 서비스 워커로 음성을 보관하지 않는 이유: iOS의 <audio>는 파일을 조각(Range)으로 요청해서
        // 조각 응답(206)은 보관이 안 되고 재생도 깨질 수 있다.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}', 'content/**/*.json'],
        globIgnores: ['content/audio/**'],
        // 앱 안 음성 인식 엔진(vosk, 약 6MB짜리 JS)도 설치 때 미리 받아 둔다 — 인터넷 없이도 인식되게.
        // 기본 한도(2MB)로는 빠지므로 한도를 올린다. 인식 모델(models/*.tar.gz, 약 40MB)은 여기 넣지 않고
        // 엔진이 처음 쓸 때 직접 받아 기기에 보관한다
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
      },
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
