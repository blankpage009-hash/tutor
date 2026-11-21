import { useEffect, useRef, useState, type PointerEvent } from 'react';

export const SWIPE_THRESHOLD = 80; // px. 이 이상 옆으로 밀면 채점
const TAP_SLOP = 10; // px. 이 이하로 움직이면 탭(뒤집기)으로 본다
const EXIT_MS = 160;

// 카드 옆으로 밀기: 오른쪽 = 아는 단어(good), 왼쪽 = 모르는 단어(again).
// 밀기 직후엔 click이 따라오므로 움직였으면 그 click(뒤집기)을 한 번 무시한다.
export function useSwipeGrade(onSwipe: (dir: 'left' | 'right') => void) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; startX: number } | null>(null);
  // 빠르게 움직일 때 state가 한 박자 늦어도 놓는 순간의 값이 정확하도록 ref에도 둔다
  const dxRef = useRef(0);
  const moved = useRef(false);
  const exiting = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const setOffset = (v: number) => { dxRef.current = v; setDx(v); };

  const onPointerDown = (e: PointerEvent) => {
    if (exiting.current) return;
    drag.current = { id: e.pointerId, startX: e.clientX };
    moved.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const d = e.clientX - drag.current.startX;
    if (Math.abs(d) > TAP_SLOP) moved.current = true;
    setOffset(d);
  };
  const end = (e: PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    const d = dxRef.current;
    if (Math.abs(d) < SWIPE_THRESHOLD) { setOffset(0); return; }
    exiting.current = true;
    setOffset(d > 0 ? window.innerWidth : -window.innerWidth);
    timer.current = window.setTimeout(() => onSwipe(d > 0 ? 'right' : 'left'), EXIT_MS);
  };
  const consumeMoved = () => {
    const was = moved.current;
    moved.current = false;
    return was || exiting.current;
  };

  return { dx, dragging, consumeMoved, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end } };
}
