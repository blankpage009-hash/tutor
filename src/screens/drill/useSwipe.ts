import { useRef, type PointerEvent } from 'react';

const MIN_DISTANCE = 50;

// 위로 쓸면 'next', 아래로 쓸면 'prev'. 가로로 더 많이 움직였거나 짧으면 null (탭·가로 스크롤과 구분)
export function swipeDirection(dx: number, dy: number): 'next' | 'prev' | null {
  if (Math.abs(dy) < MIN_DISTANCE || Math.abs(dy) < Math.abs(dx) * 1.5) return null;
  return dy < 0 ? 'next' : 'prev';
}

// 포인터 이벤트라서 아이폰 터치와 데스크톱 마우스 드래그가 같이 된다.
// 버튼 위에서 시작한 동작은 무시한다 — 버튼 탭이 쓸기로 오인되지 않게
export function useSwipe(onSwipe: (dir: 'next' | 'prev') => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: PointerEvent) => {
      start.current = (e.target as HTMLElement).closest('button') ? null : { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      const dir = s && swipeDirection(e.clientX - s.x, e.clientY - s.y);
      if (dir) onSwipe(dir);
    },
    onPointerCancel: () => { start.current = null; }
  };
}
