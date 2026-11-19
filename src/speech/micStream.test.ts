import { describe, expect, it } from 'vitest';
import { applyGain } from './micStream';

describe('applyGain', () => {
  it('작은 소리는 정한 배수만큼 그대로 키운다', () => {
    const out = applyGain(new Float32Array([0.01, -0.02]), 15);
    expect(out[0]).toBeCloseTo(0.15);
    expect(out[1]).toBeCloseTo(-0.3);
  });

  it('큰 소리는 1을 넘지 않게 부드럽게 눌러 준다', () => {
    const [a, b] = applyGain(new Float32Array([0.1, -0.1]), 15);
    expect(a).toBeGreaterThan(0.95);
    expect(a).toBeLessThanOrEqual(1);
    expect(b).toBeCloseTo(-a);
  });

  it('누르기 시작점 위에서도 큰 소리가 더 크게 남는다 (순서가 뒤집히지 않음)', () => {
    const [a, b] = applyGain(new Float32Array([0.05, 0.06]), 15);
    expect(a).toBeGreaterThan(0.7);
    expect(b).toBeGreaterThan(a);
  });

  it('1배면 그대로 둔다', () => {
    const data = new Float32Array([0.3, -0.4]);
    expect(applyGain(data, 1)).toBe(data);
    expect(data[0]).toBeCloseTo(0.3);
  });
});
