import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages는 https://<계정>.github.io/tutor/ 처럼 하위 경로에서 열리므로 base를 맞춘다.
export default defineConfig({
  base: '/tutor/',
  // 개발 서버가 없는 파일에 앱 첫 화면(index.html)을 대신 주지 않게 한다. Whisper 라이브러리는 있을 수도 있는
  // 설정 파일(processor_config.json)을 찾아보는데, 첫 화면을 받으면 설정으로 읽다가 깨진다.
  // 앱은 주소에 #을 쓰는 방식(HashRouter)이라 이 대체가 필요 없다. 배포본(GitHub Pages)은 원래 404를 준다
  appType: 'mpa',
  build: {
    // 인식 엔진 비교 시험 페이지도 함께 올린다 — 아이폰은 https 주소에서만 마이크가 열려서
    // PC 개발 서버로는 시험할 수 없다 (사용자 요청 2026-11-21, Whisper 아이폰 빠르기 시험)
    rolldownOptions: { input: { index: 'index.html', lab: 'lab/compare.html' } }
  },
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
        // woff2: 디자인 v2의 Barlow 글꼴(약 110KB)도 미리 받아 두어 오프라인에서도 같은 글꼴로 보이게.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}', 'content/**/*.json'],
        // 시험 페이지와 그 페이지만 쓰는 Whisper 라이브러리 묶음은 앱 설치 때 미리 받지 않는다 (앱과 무관).
        // 앱의 Whisper 작업 스레드(assets/whisperWorker-*.js)는 미리 받는다. Whisper 모델(models/whisper-base.en, 약 77MB)과
        // 계산 프로그램(ort-*.wasm, 27MB)은 여기 넣지 않는다 — 라이브러리가 처음 쓸 때 받아 기기(transformers-cache)에 보관한다
        globIgnores: ['content/audio/**', 'lab/**', 'assets/lab-*', 'assets/transformers*', 'assets/ort*'],
        // 앱은 모르는 주소로 와도 첫 화면(index.html)을 보여 주는데, 시험 페이지까지 앱으로 바뀌지 않게 뺀다
        navigateFallbackDenylist: [/\/lab\//],
        // 앱 안 음성 인식 엔진(vosk, 약 6MB짜리 JS)도 설치 때 미리 받아 둔다 — 인터넷 없이도 인식되게.
        // 기본 한도(2MB)로는 빠지므로 한도를 올린다. 인식 모델(models/*.tar.gz, 약 40MB)은 여기 넣지 않고
        // 엔진이 처음 쓸 때 직접 받아 기기에 보관한다
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024
      },
      manifest: {
        name: 'Natter',
        short_name: 'Natter',
        description: '영어 문장 쉐도잉 · 반복 학습',
        lang: 'ko',
        start_url: '/tutor/',
        scope: '/tutor/',
        display: 'standalone',
        background_color: '#f2f2f3',
        theme_color: '#f2f2f3',
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
