// iOS Safari 16.4+의 navigator.audioSession. 마이크를 쓰고 나면 iOS가 소리를 "통화용 작은 스피커" 모드로
// 남겨둬서 튜터 음성이 작게 들리는 문제가 있다(PLAN Phase 4). 마이크를 다 반납한 뒤 재생 모드로 되돌린다.
// 지원하지 않는 브라우저에서는 아무 일도 하지 않는다.

type SessionType = 'auto' | 'playback' | 'play-and-record';
type AudioSessionNav = Navigator & { audioSession?: { type: SessionType } };

// 아이폰 시험에서 이 조정이 오히려 문제를 일으키면 끌 수 있게 둔다 (Phase 4 진단용)
let enabled = true;
// 인식과 녹음이 동시에 마이크를 쓸 수 있어서, 마지막 사용자가 반납할 때만 재생 모드로 돌린다
let micUsers = 0;

// 끌 때는 먼저 'auto'(브라우저 기본)로 되돌린다. 그냥 끄기만 하면 마지막에 바꾼 모드에 고정돼서
// "조정 안 함"과 비교하는 시험이 의미가 없어진다
export function setAudioSessionEnabled(on: boolean): void {
  if (!on) setAudioSession('auto');
  enabled = on;
}

export function hasAudioSession(): boolean {
  return Boolean((navigator as AudioSessionNav).audioSession);
}

export function setAudioSession(type: SessionType): void {
  const nav = navigator as AudioSessionNav;
  if (!enabled || !nav.audioSession) return;
  try {
    nav.audioSession.type = type;
  } catch {
    // 일부 버전은 값 변경 시 오류를 던진다. 재생은 그대로 되므로 무시한다
  }
}

export function acquireMic(): void {
  micUsers++;
  setAudioSession('play-and-record');
}

export function releaseMic(): void {
  micUsers = Math.max(0, micUsers - 1);
  if (micUsers === 0) setAudioSession('playback');
}
