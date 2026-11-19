import { describe, expect, it } from 'vitest';
import { addDays, dueList, isDue, newSrsState, reviewSrs, startOfDay, START_EASE } from './srs';

// 2026-11-19 22:30 (로컬 시각). 밤에 연습한 경우를 기준으로 삼는다
const NIGHT = new Date(2026, 10, 19, 22, 30).getTime();

describe('날짜 계산', () => {
  it('하루 단위로 0시에 맞춘다', () => {
    expect(new Date(addDays(NIGHT, 1)).getHours()).toBe(0);
    expect(addDays(NIGHT, 1)).toBe(new Date(2026, 10, 20).getTime());
  });
});

describe('새 항목', () => {
  it('저장한 다음 날 아침부터 복습 대상이다', () => {
    const s = newSrsState('sentence', 'a', NIGHT);
    expect(s.id).toBe('sentence:a');
    expect(isDue(s, NIGHT)).toBe(false);
    expect(isDue(s, new Date(2026, 10, 20, 7, 0).getTime())).toBe(true);
  });

  it('dueInDays=0이면 바로 복습 대상이다', () => {
    expect(isDue(newSrsState('sentence', 'a', NIGHT, 0), NIGHT)).toBe(true);
  });
});

describe('복습 결과 반영', () => {
  const fresh = newSrsState('sentence', 'a', NIGHT);

  it('맞히면 간격이 점점 늘어난다 (1일 → 3일 → 더 길게)', () => {
    const a = reviewSrs(fresh, 'good', NIGHT);
    expect(a.intervalDays).toBe(1);
    const b = reviewSrs(a, 'good', NIGHT);
    expect(b.intervalDays).toBe(3);
    const c = reviewSrs(b, 'good', NIGHT);
    expect(c.intervalDays).toBe(Math.round(3 * START_EASE));
    expect(c.reps).toBe(3);
  });

  it('틀리면 내일 다시, 횟수는 처음부터, 틀린 횟수는 늘고 쉬움 점수는 내려간다', () => {
    const grown = reviewSrs(reviewSrs(fresh, 'good', NIGHT), 'good', NIGHT);
    const lapsed = reviewSrs(grown, 'again', NIGHT);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.reps).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBeLessThan(grown.ease);
    expect(lapsed.dueAt).toBe(startOfDay(addDays(NIGHT, 1)));
  });

  it('쉬움 점수는 1.3 아래로 내려가지 않는다', () => {
    let s = fresh;
    for (let i = 0; i < 20; i += 1) s = reviewSrs(s, 'again', NIGHT);
    expect(s.ease).toBe(1.3);
  });

  it('간격은 어떤 경우에도 이전보다 길어진다 (어려움이라도)', () => {
    let s = reviewSrs(reviewSrs(fresh, 'good', NIGHT), 'good', NIGHT);
    const before = s.intervalDays;
    s = reviewSrs(s, 'hard', NIGHT);
    expect(s.intervalDays).toBeGreaterThan(before);
  });

  it('쉬움은 좋음보다 더 멀리 보낸다', () => {
    const g = reviewSrs(fresh, 'good', NIGHT);
    expect(reviewSrs(g, 'easy', NIGHT).intervalDays).toBeGreaterThan(reviewSrs(g, 'good', NIGHT).intervalDays);
  });

  it('원래 상태 객체는 바뀌지 않는다', () => {
    const copy = { ...fresh };
    reviewSrs(fresh, 'good', NIGHT);
    expect(fresh).toEqual(copy);
  });
});

describe('오늘 복습 목록', () => {
  it('때가 된 것만, 오래 밀린 것부터 준다', () => {
    const now = new Date(2026, 10, 25, 9, 0).getTime();
    const late = { ...newSrsState('sentence', 'late', now), dueAt: new Date(2026, 10, 22).getTime() };
    const today = { ...newSrsState('sentence', 'today', now), dueAt: startOfDay(now) };
    const future = newSrsState('sentence', 'future', now);
    expect(dueList([future, today, late], now).map((s) => s.itemId)).toEqual(['late', 'today']);
  });
});
