import { describe, expect, it } from 'vitest';
import { creditSeconds, MAX_VISIBLE_STEP_MS } from './studyClock';

describe('creditSeconds', () => {
  it('보이는 동안은 지난 시간을 초로, 한 번에 최대 60초', () => {
    expect(creditSeconds(0, 30_000, { listenEndsAt: null, capMs: MAX_VISIBLE_STEP_MS })).toBe(30);
    expect(creditSeconds(0, 3_600_000, { listenEndsAt: null, capMs: MAX_VISIBLE_STEP_MS })).toBe(60);
  });

  it('잠금화면 듣기는 파일이 끝날 예정 시각까지만', () => {
    expect(creditSeconds(0, 900_000, { listenEndsAt: 300_000, capMs: null })).toBe(300);
    expect(creditSeconds(0, 120_000, { listenEndsAt: 300_000, capMs: null })).toBe(120);
  });

  it('시작이 끝 예정보다 늦으면 0', () => {
    expect(creditSeconds(400_000, 500_000, { listenEndsAt: 300_000, capMs: null })).toBe(0);
  });
});
