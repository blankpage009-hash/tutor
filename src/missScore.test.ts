import { describe, expect, it } from 'vitest';
import { missOf, weightedOrder, weightOf, withExtras } from './missScore';

// 매번 같은 값이 나오게 하는 가짜 난수 (테스트를 되풀이해도 결과가 같도록)
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('틀림 점수', () => {
  it('숫자가 아니거나 음수면 0으로 본다', () => {
    expect(missOf({})).toBe(0);
    expect(missOf({ miss: 'x' })).toBe(0);
    expect(missOf({ miss: -2 })).toBe(0);
    expect(missOf({ miss: NaN })).toBe(0);
    expect(missOf({ miss: 3 })).toBe(3);
  });

  it('가중치는 1 + 점수, 최대 6', () => {
    expect(weightOf(0)).toBe(1);
    expect(weightOf(2)).toBe(3);
    expect(weightOf(40)).toBe(6);
  });
});

describe('가중치 섞기', () => {
  it('가중치가 모두 1이면 예전 섞기와 같은 순서', () => {
    expect(weightedOrder(['a', 'b', 'c'], () => 1, () => 0)).toEqual(['b', 'c', 'a']);
  });

  it('점수 높은 문장이 앞쪽에 오기 쉽다', () => {
    const items = ['hard', 'b', 'c', 'd', 'e', 'f'];
    const rng = seeded(7);
    let first = 0;
    for (let i = 0; i < 1000; i++) {
      if (weightedOrder(items, (x) => (x === 'hard' ? 6 : 1), rng)[0] === 'hard') first++;
    }
    // 이론값: 6 / (6 + 5) ≈ 55%. 공평하게 섞으면 약 17%
    expect(first).toBeGreaterThan(450);
    expect(first).toBeLessThan(650);
  });

  it('빠지거나 겹치는 문장이 없다', () => {
    const got = weightedOrder(['a', 'b', 'c', 'd'], (x) => (x === 'c' ? 3 : 1), seeded(1));
    expect([...got].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('한 번 더 끼우기', () => {
  const ids = (list: { item: string; extra: boolean }[]) => list.map((x) => (x.extra ? `${x.item}+` : x.item));

  it('원래 자리보다 3문장 이상 뒤에 끼운다', () => {
    const got = withExtras(['a', 'b', 'c', 'd', 'e', 'f'], (x) => (x === 'a' ? 1 : 0));
    expect(ids(got)).toEqual(['a', 'b', 'c', 'd', 'a+', 'e', 'f']);
  });

  it('자리가 모자라면 맨 끝에', () => {
    const got = withExtras(['a', 'b', 'c'], (x) => (x === 'b' ? 2 : 0));
    expect(ids(got)).toEqual(['a', 'b', 'c', 'b+']);
  });

  it('점수 높은 순으로 최대 절반(올림)까지', () => {
    const miss: Record<string, number> = { a: 1, b: 3, c: 2, d: 0, e: 1 };
    const got = withExtras(['a', 'b', 'c', 'd', 'e'], (x) => miss[x]);
    expect(got.filter((x) => x.extra).map((x) => x.item).sort()).toEqual(['a', 'b', 'c']);
    expect(got).toHaveLength(8);
  });

  it('문장이 1개면 끼우지 않는다', () => {
    expect(ids(withExtras(['a'], () => 5))).toEqual(['a']);
  });

  it('틀린 적 없으면 그대로', () => {
    expect(ids(withExtras(['a', 'b'], () => 0))).toEqual(['a', 'b']);
  });
});
