import { describe, expect, it } from 'vitest';
import { buildTimeline, cardAt, encodeWav } from './audioStitch';

describe('듣기만 이어 붙이기 시간표', () => {
  it('앞 쉼 뒤 문장, 문장 뒤 쉼 순서로 자리를 잡는다', () => {
    const tl = buildTimeline([2, 3], 1, 1.5);
    expect(tl.offsets).toEqual([1, 4.5]);
    expect(tl.starts).toEqual([0, 4.5]);
    expect(tl.total).toBe(9);
  });

  it('재생 위치로 보여 줄 카드를 찾는다', () => {
    const { starts } = buildTimeline([2, 3, 1], 1, 1.5);
    expect(cardAt(starts, 0)).toBe(0);
    expect(cardAt(starts, 4.4)).toBe(0);
    expect(cardAt(starts, 4.5)).toBe(1);
    expect(cardAt(starts, 100)).toBe(2);
  });

  it('WAV 크기는 머리글 44바이트 + 샘플당 2바이트', () => {
    expect(encodeWav(new Float32Array(10)).size).toBe(64);
  });
});
