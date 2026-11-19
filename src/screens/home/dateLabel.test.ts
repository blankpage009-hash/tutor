import { describe, expect, it } from 'vitest';
import { dateLabel } from './dateLabel';

describe('홈 날짜 라벨', () => {
  it('월 일 · 요일을 영문 대문자로 만든다', () => {
    expect(dateLabel(new Date(2026, 10, 19))).toBe('NOV 19 · THU');
    expect(dateLabel(new Date(2026, 0, 1))).toBe('JAN 1 · THU');
  });
});
