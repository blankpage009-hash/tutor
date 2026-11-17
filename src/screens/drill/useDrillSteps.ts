import { useCallback, useRef, useState } from 'react';

// 드릴 60회 중 지금 몇 번째인지와 통과한 회차. 회차마다 통과 1번이면 끝 (회차 자체가 반복이라서)
export function useDrillSteps(total: number) {
  const [index, setIndex] = useState(0);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);
  // 판정 콜백은 렌더 사이에 불릴 수 있어 최신 값을 ref로도 들고 있는다
  const indexRef = useRef(index);
  indexRef.current = index;
  const clearedRef = useRef(cleared);

  // 회차는 통과 1번이면 끝이라 늘 true (이어 말하기가 다음 회차로 넘어가게).
  // 이전 버튼으로 돌아가 이미 끝낸 회차를 다시 통과해도 넘어가야 한다
  const recordPass = useCallback((id: string) => {
    if (!clearedRef.current.has(id)) {
      clearedRef.current = new Set(clearedRef.current).add(id);
      setCleared(clearedRef.current);
    }
    return true;
  }, []);

  const next = useCallback(() => {
    if (indexRef.current < total - 1) setIndex(indexRef.current + 1);
    else setFinished(true);
  }, [total]);

  // 다음 버튼: 통과로 세지 않는다. 마지막 회차에서 누르면 드릴을 마친다 (끝까지 못 넘어가 갇히지 않게)
  const skip = next;

  const prev = useCallback(() => {
    if (indexRef.current > 0) setIndex(indexRef.current - 1);
    setFinished(false);
  }, []);

  return { index, cleared, recordPass, next, skip, prev, finished };
}
