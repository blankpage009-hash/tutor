import { describe, expect, it } from 'vitest';
import { pickMaskedIndices } from './maskWords';

const pick = (s: string) => [...pickMaskedIndices(s.split(' '))].sort((a, b) => a - b);

describe('가릴 중요 단어 고르기', () => {
  it('기능어는 빼고 긴 단어부터, 약 1/3', () => {
    // I'm(0) torn(1) between(2) these(3) two.(4) → 5단어의 1/3 ≈ 2개: between, torn
    expect(pick("I'm torn between these two.")).toEqual([1, 2]);
  });

  it('많아도 3개까지', () => {
    expect(pick('Seriously everybody remembers wonderful summer holidays somewhere beautiful')).toHaveLength(3);
  });

  it('가릴 만한 단어가 없으면 비어 있다', () => {
    expect(pick('I am in it')).toEqual([]);
  });
});
