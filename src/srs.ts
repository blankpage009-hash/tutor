// 복습 달력 계산 (단순화한 SM-2). 문장과 단어(3세션)가 같이 쓰는 순수 모듈이라 화면·DB를 모른다.
// 날짜는 "하루 단위"로만 센다: 밤 10시에 연습해도 "내일"이면 내일 아침부터 복습 큐에 보이게,
// 복습 시각을 그날 0시로 맞춘다 (시각까지 더하면 다음 날 아침엔 아직 때가 안 된 것으로 나온다)
import type { SrsState } from './db/types';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export const START_EASE = 2.5;
const MIN_EASE = 1.3;

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// setDate로 더해야 서머타임이 있는 날에도 정확히 "다음 날 0시"가 된다
export function addDays(ms: number, days: number): number {
  const d = new Date(startOfDay(ms));
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function srsId(kind: SrsState['kind'], itemId: string): string {
  return `${kind}:${itemId}`;
}

// 새 항목: 아직 한 번도 복습 안 함. dueInDays일 뒤부터 큐에 나온다
// (문장을 저장한 날은 쉬고 내일부터가 기본, 예전에 저장한 문장을 뒤늦게 넣을 땐 0 = 오늘)
export function newSrsState(kind: SrsState['kind'], itemId: string, now: number, dueInDays = 1): SrsState {
  return { id: srsId(kind, itemId), kind, itemId, dueAt: addDays(now, dueInDays), intervalDays: 0, ease: START_EASE, reps: 0, lapses: 0 };
}

function nextInterval(s: SrsState, grade: Grade): number {
  if (grade === 'again') return 1; // 틀리면 내일 다시
  if (s.reps === 0) return grade === 'easy' ? 4 : 1;
  if (s.reps === 1) return grade === 'hard' ? 2 : grade === 'easy' ? 7 : 3;
  const factor = grade === 'hard' ? 1.2 : grade === 'easy' ? s.ease * 1.3 : s.ease;
  return Math.max(s.intervalDays + 1, Math.round(s.intervalDays * factor));
}

function nextEase(ease: number, grade: Grade): number {
  const delta = { again: -0.2, hard: -0.15, good: 0, easy: 0.15 }[grade];
  return Math.max(MIN_EASE, Math.round((ease + delta) * 100) / 100);
}

// 복습 결과 하나를 반영한 새 상태. 원래 상태는 건드리지 않는다
export function reviewSrs(s: SrsState, grade: Grade, now: number): SrsState {
  const intervalDays = nextInterval(s, grade);
  return {
    ...s,
    intervalDays,
    ease: nextEase(s.ease, grade),
    reps: grade === 'again' ? 0 : s.reps + 1,
    lapses: grade === 'again' ? s.lapses + 1 : s.lapses,
    dueAt: addDays(now, intervalDays)
  };
}

export function isDue(s: SrsState, now: number): boolean {
  return s.dueAt <= now;
}

// 오늘 복습할 것: 오래 밀린 것부터
export function dueList(states: SrsState[], now: number): SrsState[] {
  return states.filter((s) => isDue(s, now)).sort((a, b) => a.dueAt - b.dueAt);
}
