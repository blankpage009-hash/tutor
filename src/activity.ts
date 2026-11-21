// 날짜별 활동 기록으로 연속 학습일(스트릭)과 일일 목표를 계산하는 순수 모듈. 날짜는 기기의 "오늘" 기준이다.

import type { Activity } from './db/types';

export type DayRow = Activity;

const pad = (n: number) => String(n).padStart(2, '0');

// 자정은 기기 시간대 기준이어야 "오늘 했는데 어제로 찍힘" 같은 일이 없어서 UTC가 아니라 현지 날짜를 쓴다
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 'YYYY-MM-DD'에 날짜를 더한다. Date가 달·연 넘김(2월·윤년 포함)을 계산해 준다
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n).getTime());
}

// 오늘 안 했어도 어제까지 이어졌으면 연속은 아직 살아 있다 (하루가 끝나야 끊긴다)
export function currentStreak(dates: ReadonlySet<string>, today: string): number {
  let day = dates.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (dates.has(day)) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

export function longestStreak(dates: ReadonlySet<string>): number {
  let best = 0;
  for (const d of dates) {
    if (dates.has(addDays(d, -1))) continue; // 연속의 첫날에서만 센다
    let n = 0;
    for (let day = d; dates.has(day); day = addDays(day, 1)) n += 1;
    best = Math.max(best, n);
  }
  return best;
}

export type LifetimeTotals = { spoken: number; minutes: number };

// 설정 화면 SPOKEN·STUDY TIME 누적값. spoken이 없는 옛 줄은 통과 기록(practice)으로 본다
export function lifetimeTotals(rows: readonly DayRow[]): LifetimeTotals {
  let spoken = 0;
  let seconds = 0;
  for (const r of rows) {
    spoken += r.spoken ?? r.practice;
    seconds += r.seconds ?? 0;
  }
  return { spoken, minutes: Math.floor(seconds / 60) };
}

export type GoalProgress = { count: number; goal: number; met: boolean };

export function goalProgress(row: DayRow | undefined, goal: number): GoalProgress {
  const count = (row?.practice ?? 0) + (row?.review ?? 0);
  return { count, goal, met: count >= goal };
}
