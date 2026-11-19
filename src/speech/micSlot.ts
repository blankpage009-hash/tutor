import { releaseMic } from './audioSession';
import type { MicStream } from './micStream';

// 마이크를 들을 때 열고, 튜터 재생 전에 닫을 수 있게 쥐고 있는다 (이어 말하기·드릴·롤플레이 공용).
// 마이크가 열려 있으면 iOS가 소리를 통화 모드로 바꿔 튜터 목소리에 잡음이 섞인다 — 재생 중에 닫으면 줄어든다
// (아이폰 결과 2026-11-19, 진단 ⑨). 다시 열 때도 탭 순간 만든 ctx를 그대로 써야 iOS가 마이크 소리를 준다
export type MicSlot = {
  get: () => Promise<MicStream | string>; // 실패하면 화면에 보일 안내 문구
  release: () => void;
  current: () => MicStream | null;
};

// open은 acquireMic까지 해 주는 openVoskMic를 넘긴다. 그래서 닫을 때 releaseMic을 짝으로 부른다
export function createMicSlot(open: () => Promise<MicStream | string>, log: (m: string) => void): MicSlot {
  let mic: MicStream | null = null;
  return {
    current: () => mic,
    async get() {
      if (mic) return mic;
      const t0 = performance.now();
      const m = await open();
      if (typeof m === 'string') return m;
      mic = m;
      // 첫 단어가 잘리는지 판단하려고 여는 데 걸린 시간을 남긴다
      log(`마이크 여는 데 ${Math.round(performance.now() - t0)}ms`);
      return m;
    },
    release() {
      if (!mic) return;
      mic.close();
      releaseMic();
      mic = null;
    }
  };
}

// 드릴·롤플레이 마이크 설정 (사용자 승인 2026-11-19, 아이폰 결과 3차 방식).
// 처리를 끄면 마이크가 더 빨리 켜지고(약 0.6초 대 1초), 대신 작아진 소리를 앱이 15배로 키운다
export const TUTOR_SAFE_MIC = { micProcessing: false, micGain: 15, micOffWhilePlaying: true } as const;
