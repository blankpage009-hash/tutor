import { describe, expect, it } from 'vitest';
import { dueLabel } from './dueLabel';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('다음 복습 날짜 표시', () => {
  const now = at(2026, 11, 20, 9);
  it('복습 기록이 없으면 표시하지 않는다', () => expect(dueLabel(undefined, now)).toBeNull());
  it('오늘 밤 12시 전이면 TODAY', () => expect(dueLabel(at(2026, 11, 20, 23, 59), now)).toEqual({ text: 'TODAY', today: true }));
  it('이미 지난 복습도 TODAY', () => expect(dueLabel(at(2026, 11, 2), now)?.text).toBe('TODAY'));
  it('내일부터는 영문 월 + 날짜', () => {
    expect(dueLabel(at(2026, 11, 21, 0, 0), now)).toEqual({ text: 'NOV 21', today: false });
    expect(dueLabel(at(2027, 1, 3, 10), now)?.text).toBe('JAN 3');
  });
});
