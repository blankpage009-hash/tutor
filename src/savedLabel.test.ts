import { describe, expect, it } from 'vitest';
import { savedLabel } from './savedLabel';

const now = new Date(2026, 10, 21, 15, 0).getTime();
const ago = (y: number, m: number, d: number) => new Date(y, m - 1, d, 23, 0).getTime();
const text = (t: number) => savedLabel(t, now).text;

describe('savedLabel', () => {
  it('오늘 저장하면 Today', () => expect(savedLabel(ago(2026, 11, 21), now)).toEqual({ text: 'Today', today: true }));
  it('며칠 전', () => {
    expect(text(ago(2026, 11, 20))).toBe('1일전');
    expect(text(ago(2026, 11, 19))).toBe('2일전');
    expect(text(ago(2026, 11, 18))).toBe('3일전');
  });
  it('주 단위', () => {
    expect(text(ago(2026, 11, 14))).toBe('1주전');
    expect(text(ago(2026, 11, 7))).toBe('2주전');
  });
  it('개월 단위', () => {
    expect(text(ago(2026, 10, 21))).toBe('1개월전');
    expect(text(ago(2026, 8, 21))).toBe('3개월전');
  });
  it('년 단위', () => {
    expect(text(ago(2025, 11, 21))).toBe('1년전');
    expect(text(ago(2025, 10, 21))).toBe('1년 1개월전');
  });
});
