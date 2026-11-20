import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { clampOffset, LONG_PRESS_MS, settleOpen, swipeIntent } from './swipeGesture';

type Options = {
  width: number; // 나오는 버튼 전체 폭
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swipeEnabled: boolean;
  onLongPress?: () => void;
};

type Gesture = { x: number; y: number; base: number; intent: ReturnType<typeof swipeIntent>; lastX: number; lastT: number; v: number };

// 손가락이 움직일 때마다 처음 방향(가로/세로)을 정하고, 가로면 빠르기(px/ms)를 잰다. 처음 방향이 막 정해졌으면 true
function step(s: Gesture, e: PointerEvent<HTMLElement>): boolean {
  if (s.intent === 'none') {
    s.intent = swipeIntent(e.clientX - s.x, e.clientY - s.y);
    if (s.intent !== 'none') return true;
  }
  const dt = e.timeStamp - s.lastT;
  if (dt > 0) s.v = (e.clientX - s.lastX) / dt;
  s.lastX = e.clientX;
  s.lastT = e.timeStamp;
  return false;
}

// 길게 누르기: 누른 채 LONG_PRESS_MS가 지나면 실행. 움직이거나 떼면 취소
function useLongPress(onLongPress: (() => void) | undefined, onFire: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const cancel = () => window.clearTimeout(timer.current);
  useEffect(() => cancel, []);
  const start = () => {
    if (onLongPress) timer.current = window.setTimeout(() => { onFire(); onLongPress(); }, LONG_PRESS_MS);
  };
  return { start, cancel };
}

// 줄을 왼쪽으로 밀어 버튼을 꺼내고, 길게 누르기를 알아챈다. 포인터 이벤트 하나로 손가락·마우스를 같이 받는다.
// 세로로 움직이면 아무것도 하지 않고 화면 스크롤에 맡긴다 (CSS touch-action: pan-y와 짝)
export function useSwipeRow({ width, open, onOpenChange, swipeEnabled, onLongPress }: Options) {
  const [drag, setDrag] = useState<number | null>(null);
  const g = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const press = useLongPress(onLongPress, () => { suppressClick.current = true; g.current = null; });

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    g.current = { x: e.clientX, y: e.clientY, base: open ? -width : 0, intent: 'none', lastX: e.clientX, lastT: e.timeStamp, v: 0 };
    suppressClick.current = false;
    press.start();
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = g.current;
    if (!s) return;
    if (step(s, e)) {
      press.cancel();
      // 가로 밀기로 정해진 뒤에만 포인터를 붙잡는다 (처음부터 잡으면 세로 스크롤이 막힌다)
      if (s.intent === 'horizontal' && swipeEnabled) e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.intent === 'horizontal' && swipeEnabled) setDrag(clampOffset(s.base, e.clientX - s.x, width));
  };

  const finish = (cancelled: boolean) => {
    press.cancel();
    const s = g.current;
    g.current = null;
    if (!s || s.intent === 'none') return;
    suppressClick.current = true;
    if (!cancelled && s.intent === 'horizontal' && swipeEnabled && drag !== null) onOpenChange(settleOpen(drag, width, s.v));
    setDrag(null);
  };

  // 밀거나 길게 누른 뒤 손을 떼면 click이 따라오는데, 그건 "누르기"가 아니라서 버린다. 열린 줄을 누르면 닫기만
  const onClickCapture = (e: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current && !open) return;
    e.preventDefault();
    e.stopPropagation();
    if (!suppressClick.current) onOpenChange(false);
    suppressClick.current = false;
  };

  return {
    offset: drag ?? (open ? -width : 0), dragging: drag !== null,
    handlers: {
      onPointerDown, onPointerMove, onClickCapture,
      onPointerUp: () => finish(false), onPointerCancel: () => finish(true),
      // 데스크톱·안드로이드에서 길게 누르면 뜨는 메뉴를 막는다 (iOS는 CSS -webkit-touch-callout)
      onContextMenu: (e: MouseEvent<HTMLElement>) => { if (onLongPress) e.preventDefault(); }
    }
  };
}
