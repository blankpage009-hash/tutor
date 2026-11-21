import { unlockAudio } from '../../speech/audioPlayer';
import { createCaptureContext } from '../../speech/pcmCapture';
import { loadPracticeOptions } from './practiceOptions';

// 보관함에서 Shadow·줄을 누르면 연습 화면이 열리자마자 튜터가 말하게 한다 (사용자 요청 2026-11-21).
// iOS는 "탭한 순간" 허락받은 소리·마이크 장치만 쓰게 하는데, 연습 화면은 문장·인식 엔진을 읽은 뒤에야 시작할 수 있다.
// 그래서 탭한 순간 소리 허락과 마이크 장치를 미리 만들어 두고, 다음 화면이 이어받는다 (이어달리기 바통)
export type PracticeLaunch = { ctx: AudioContext | null; at: number };

// 탭 뒤 문장·화면을 읽는 동안만 유효. 새로고침·뒤로 가기로 다시 열린 화면은 자동으로 시작하지 않게
const FRESH_MS = 10_000;

let pending: PracticeLaunch | null = null;

function closeCtx(ctx: AudioContext | null | undefined): void {
  ctx?.close().catch(() => undefined);
}

// 탭 처리 안에서 (await 전에) 불러야 한다
export function armPracticeLaunch(): void {
  closeCtx(pending?.ctx); // 쓰이지 않은 채 남은 장치는 여기서 정리한다
  unlockAudio();
  // 듣기만은 마이크를 안 쓰므로 장치를 만들지 않는다
  const ctx = loadPracticeOptions().listening ? null : createCaptureContext();
  pending = { ctx, at: Date.now() };
}

// 보기만 한다 (화면이 두 번 그려져도 바통이 사라지지 않게). 실제로 시작할 때 takePracticeLaunch로 가져간다
export function peekPracticeLaunch(now = Date.now()): PracticeLaunch | null {
  return pending && now - pending.at <= FRESH_MS ? pending : null;
}

export function takePracticeLaunch(): PracticeLaunch | null {
  const p = pending;
  pending = null;
  return p;
}

// 시작하지 못하게 됐을 때 (인식 엔진 오류 등) 장치를 돌려놓는다
export function dropPracticeLaunch(): void {
  closeCtx(takePracticeLaunch()?.ctx);
}
