import { describe, expect, it } from 'vitest';
import { feedbackSeconds, renderFeedback } from './feedbackSound';

describe('효과음 만들기', () => {
  it('통과·실패는 짧고(0.5초 안), 완료는 1초 남짓', () => {
    expect(feedbackSeconds('pass')).toBeLessThan(0.5);
    expect(feedbackSeconds('fail')).toBeLessThan(0.5);
    expect(feedbackSeconds('complete')).toBeGreaterThan(1);
    expect(feedbackSeconds('complete')).toBeLessThan(1.2);
  });

  it('최대 크기는 0.5로 맞춰 튜터 음성보다 튀지 않는다', () => {
    for (const k of ['pass', 'fail', 'complete'] as const) {
      const s = renderFeedback(k);
      const max = s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      expect(max).toBeCloseTo(0.5, 5);
    }
  });

  it('끝은 거의 무음으로 사라진다 (뚝 끊기는 소리 없음)', () => {
    const s = renderFeedback('pass');
    expect(Math.abs(s[s.length - 1])).toBeLessThan(0.05);
  });
});
