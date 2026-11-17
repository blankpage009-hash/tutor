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

  // 이번 통과로 처음 끝낸 회차면 true
  const recordPass = useCallback((id: string) => {
    if (clearedRef.current.has(id)) return false;
    clearedRef.current = new Set(clearedRef.current).add(id);
    setCleared(clearedRef.current);
    return true;
  }, []);

  const next = useCallback(() => {
    if (indexRef.current < total - 1) setIndex(indexRef.current + 1);
    else setFinished(true);
  }, [total]);

  // 건너뛰기: 통과로 세지 않는다. 마지막 회차에서 건너뛰면 드릴을 마친다 (끝까지 못 넘어가 갇히지 않게)
  const skip = next;

  return { index, cleared, recordPass, next, skip, finished };
}
