import { useCallback, useRef } from 'react';

// 숨겨 둔 진단 패널을 여는 비밀 손짓: 짧은 시간 안에 여러 번 누르면 onTrigger.
// 평소 화면에는 진단이 보이지 않게 하되, 아이폰 확인이 필요할 때 다시 열 수 있게 하려는 것 (사용자 결정 2026-11-16)
export function useSecretTaps(onTrigger: () => void, count = 5, windowMs = 3000) {
  const taps = useRef<number[]>([]);
  const triggerRef = useRef(onTrigger);
  triggerRef.current = onTrigger;
  return useCallback(() => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < windowMs), now];
    if (taps.current.length >= count) {
      taps.current = [];
      triggerRef.current();
    }
  }, [count, windowMs]);
}
