import { describe, expect, it } from 'vitest';
import { applyGain } from './micStream';

describe('applyGain', () => {
  it('작은 소리를 정한 배수만큼 키운다', () => {
    const out = applyGain(new Float32Array([0.01, -0.02]), 25);
    expect(out[0]).toBeCloseTo(0.25);
    expect(out[1]).toBeCloseTo(-0.5);
  });

  it('키운 소리가 -1~1을 넘으면 끝을 자른다', () => {
    expect([...applyGain(new Float32Array([0.1, -0.1]), 25)]).toEqual([1, -1]);
  });

  it('1배면 그대로 둔다', () => {
    const data = new Float32Array([0.3, -0.4]);
    expect(applyGain(data, 1)).toBe(data);
    expect(data[0]).toBeCloseTo(0.3);
  });
});
