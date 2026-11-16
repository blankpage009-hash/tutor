// 수업 안 문장별 통과 횟수 계산. 화면(React)과 떼어 두어 테스트로 확인한다.
// "반복 횟수"(설정 1~5회, PLAN 5.3) = 다음 문장으로 넘어가려면 통과해야 하는 횟수.

export type PassCounts = ReadonlyMap<string, number>;

export function addPass(counts: PassCounts, id: string): Map<string, number> {
  const next = new Map(counts);
  next.set(id, (counts.get(id) ?? 0) + 1);
  return next;
}

export function isCleared(counts: PassCounts, id: string, required: number): boolean {
  return (counts.get(id) ?? 0) >= required;
}

export function clearedIds(counts: PassCounts, required: number): Set<string> {
  return new Set([...counts].filter(([, n]) => n >= required).map(([id]) => id));
}

// 자동 넘기기는 필요 횟수를 "막 채운" 통과 때만 한다. 이미 끝낸 문장으로 돌아가 더 연습할 때
// 통과할 때마다 저절로 넘어가 버리면 반복 연습을 할 수 없기 때문
export function justCleared(before: PassCounts, id: string, required: number): boolean {
  return (before.get(id) ?? 0) + 1 === required;
}

// 앞 문장을 끝냈을 때만 고를 수 있다 (통과 전에는 다음 문장으로 넘어가지 않음, PLAN 5.3)
export function isReachable(ids: string[], index: number, cleared: Set<string>): boolean {
  return index === 0 || cleared.has(ids[index - 1]);
}
