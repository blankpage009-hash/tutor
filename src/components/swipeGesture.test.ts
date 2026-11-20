import { describe, expect, it } from 'vitest';
import { clampOffset, settleOpen, swipeIntent } from './swipeGesture';

describe('줄 밀기', () => {
  it('반 넘게 밀면 열리고, 덜 밀면 닫힌다', () => {
    expect(settleOpen(-50, 76, 0)).toBe(true);
    expect(settleOpen(-30, 76, 0)).toBe(false);
  });
  it('짧게라도 빠르게 왼쪽으로 휙 밀면 열리고, 오른쪽으로 휙 밀면 닫힌다', () => {
    expect(settleOpen(-10, 76, -0.8)).toBe(true);
    expect(settleOpen(-70, 76, 0.8)).toBe(false);
  });
  it('밀린 거리는 버튼 폭과 0 사이', () => {
    expect(clampOffset(0, -200, 152)).toBe(-152);
    expect(clampOffset(-76, 300, 152)).toBe(0);
    expect(clampOffset(-76, 20, 152)).toBe(-56);
  });
  it('조금 움직인 것은 누르기, 더 움직이면 가로·세로를 가른다', () => {
    expect(swipeIntent(3, 4)).toBe('none');
    expect(swipeIntent(-20, 5)).toBe('horizontal');
    expect(swipeIntent(4, 30)).toBe('vertical');
  });
});
