import { describe, expect, it } from 'vitest';
import { downsample, encodeWav, mergeChunks } from './wav';

describe('WAV 만들기', () => {
  it('48kHz → 16kHz는 3개씩 평균', () => {
    const out = downsample(new Float32Array([0, 0.3, 0.6, 1, 1, 1]), 48000, 16000);
    expect(Array.from(out).map((x) => Number(x.toFixed(2)))).toEqual([0.3, 1]);
  });

  it('조각을 순서대로 이어 붙인다', () => {
    expect(Array.from(mergeChunks([new Float32Array([1, 2]), new Float32Array([3])]))).toEqual([1, 2, 3]);
  });

  it('머리말과 크기가 맞는 16비트 모노 WAV', () => {
    const buf = encodeWav(new Float32Array([0, 1, -1]), 16000);
    const v = new DataView(buf);
    const tag = (at: number) => String.fromCharCode(...new Uint8Array(buf, at, 4));
    expect(tag(0)).toBe('RIFF');
    expect(tag(8)).toBe('WAVE');
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint32(40, true)).toBe(6);
    expect(buf.byteLength).toBe(50);
    expect(v.getInt16(46, true)).toBe(0x7fff);
    expect(v.getInt16(48, true)).toBe(-0x8000);
  });
});
