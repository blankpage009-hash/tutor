import { useCallback, useRef, useState } from 'react';
import { logActivity } from '../../db/activity';
import type { DrillPosition } from '../../db/types';

// 드릴 60회 중 지금 몇 번째인지와 통과한 회차. 회차마다 통과 1번이면 끝 (회차 자체가 반복이라서).
// initial: 하다 만 위치에서 이어서 시작 (사용자 요청 2026-11-18). 레슨이 바뀌어 회차 수가 줄었으면 처음부터
export function useDrillSteps(total: number, initial?: DrillPosition) {
  const resume = initial && initial.index < total ? initial : undefined;
  const [index, setIndex] = useState(resume?.index ?? 0);
  const [cleared, setCleared] = useState<Set<string>>(() => new Set(resume?.cleared ?? []));
  const [finished, setFinished] = useState(false);
  // 판정 콜백은 렌더 사이에 불릴 수 있어 최신 값을 ref로도 들고 있는다
  const indexRef = useRef(index);
  indexRef.current = index;
  const clearedRef = useRef(cleared);

  // 회차는 통과 1번이면 끝이라 늘 true (이어 말하기가 다음 회차로 넘어가게).
  // 이전 버튼으로 돌아가 이미 끝낸 회차를 다시 통과해도 넘어가야 한다
  const recordPass = useCallback((id: string) => {
    if (!clearedRef.current.has(id)) {
      logActivity('practice'); // 같은 회차를 다시 통과한 것은 세지 않는다 (이전 버튼으로 돌아가 반복해도 목표가 부풀지 않게)
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

  // Restart 버튼: 하다 만 기록을 버리고 1회차부터. 저장은 useKeepDrillPosition이 바뀐 값을 알아서 남긴다
  const restart = useCallback(() => {
    clearedRef.current = new Set();
    setCleared(clearedRef.current);
    setIndex(0);
    setFinished(false);
  }, []);

  // 보관함 듣기만: 화면을 꺼 둔 사이 여러 카드가 지나갔을 수 있어 한 번에 옮긴다. 끝을 넘으면 마친다
  const goTo = useCallback((i: number) => {
    if (i >= total) { setFinished(true); return; }
    indexRef.current = i;
    setIndex(i);
  }, [total]);

  return { index, cleared, recordPass, next, skip, prev, restart, finished, goTo };
}
