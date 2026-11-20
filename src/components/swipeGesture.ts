// 줄 밀기·길게 누르기의 순수 계산 (화면과 떼어 테스트한다)

export const SWIPE_ACTION_WIDTH = 76; // 밀면 나오는 버튼 한 칸 폭(px)
export const INTENT_PX = 8; // 손가락이 이만큼 움직여야 "밀기"로 본다 (그 전엔 누르기)
export const LONG_PRESS_MS = 500;

// 손가락을 뗐을 때 열지 닫을지: 반 넘게 밀었거나, 짧아도 빠르게 휙 밀었으면 연다
export function settleOpen(offset: number, width: number, velocity: number): boolean {
  if (velocity < -0.5) return true;
  if (velocity > 0.5) return false;
  return offset < -width / 2;
}

// 밀린 거리: 왼쪽으로는 버튼 폭까지만, 오른쪽으로는 0을 넘지 않는다
export function clampOffset(start: number, dx: number, width: number): number {
  return Math.min(0, Math.max(-width, start + dx));
}

// 처음 움직임이 가로인지 세로인지. 세로면 화면 스크롤에 맡긴다
export function swipeIntent(dx: number, dy: number): 'none' | 'horizontal' | 'vertical' {
  if (Math.abs(dx) < INTENT_PX && Math.abs(dy) < INTENT_PX) return 'none';
  return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
}
