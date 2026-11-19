import { describe, expect, it } from 'vitest';
import { addDays, currentStreak, dayKey, goalProgress, longestStreak } from './activity';

const set = (...d: string[]) => new Set(d);

describe('dayKey / addDays', () => {
  it('현지 날짜를 YYYY-MM-DD로', () => {
    expect(dayKey(new Date(2026, 10, 5, 23, 59).getTime())).toBe('2026-11-05');
    expect(dayKey(new Date(2026, 0, 1, 0, 0).getTime())).toBe('2026-01-01');
  });

  it('달·연·윤년을 넘긴다', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('currentStreak', () => {
  it('기록이 없으면 0', () => {
    expect(currentStreak(set(), '2026-11-19')).toBe(0);
  });

  it('오늘까지 이어진 날 수', () => {
    expect(currentStreak(set('2026-11-17', '2026-11-18', '2026-11-19'), '2026-11-19')).toBe(3);
  });

  it('오늘 아직 안 했어도 어제까지 이어졌으면 유지', () => {
    expect(currentStreak(set('2026-11-17', '2026-11-18'), '2026-11-19')).toBe(2);
  });

  it('어제도 안 했으면 끊김', () => {
    expect(currentStreak(set('2026-11-16', '2026-11-17'), '2026-11-19')).toBe(0);
  });

  it('중간에 빈 날이 있으면 거기서 멈춘다', () => {
    expect(currentStreak(set('2026-11-15', '2026-11-17', '2026-11-18', '2026-11-19'), '2026-11-19')).toBe(3);
  });

  it('달이 바뀌어도 센다', () => {
    expect(currentStreak(set('2026-10-31', '2026-11-01'), '2026-11-01')).toBe(2);
  });
});

describe('longestStreak', () => {
  it('가장 긴 연속', () => {
    expect(longestStreak(set('2026-11-01', '2026-11-02', '2026-11-05', '2026-11-06', '2026-11-07'))).toBe(3);
    expect(longestStreak(set())).toBe(0);
    expect(longestStreak(set('2026-11-01'))).toBe(1);
  });
});

describe('goalProgress', () => {
  it('연습과 복습을 합쳐 목표와 비교', () => {
    expect(goalProgress({ date: 'x', practice: 4, review: 6 }, 10)).toEqual({ count: 10, goal: 10, met: true });
    expect(goalProgress({ date: 'x', practice: 4, review: 5 }, 10).met).toBe(false);
    expect(goalProgress(undefined, 10)).toEqual({ count: 0, goal: 10, met: false });
  });
});
