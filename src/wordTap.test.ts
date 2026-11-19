import { describe, expect, it } from 'vitest';
import { normalizeWord, segmentWords } from './wordTap';

describe('segmentWords', () => {
  it('단어와 문장부호·공백을 나눈다', () => {
    expect(segmentWords('Hi, how are you?')).toEqual([
      { text: 'Hi', word: true }, { text: ', ', word: false }, { text: 'how', word: true },
      { text: ' ', word: false }, { text: 'are', word: true }, { text: ' ', word: false },
      { text: 'you', word: true }, { text: '?', word: false }
    ]);
  });

  it('줄임말과 붙임표 단어는 하나로 본다', () => {
    const words = segmentWords("I don't like well-known cafés").filter((s) => s.word).map((s) => s.text);
    expect(words).toEqual(['I', "don't", 'like', 'well-known', 'cafés']);
  });

  it('둥근 따옴표 줄임말도 하나로 본다', () => {
    expect(segmentWords('It’s fine').filter((s) => s.word).map((s) => s.text)).toEqual(['It’s', 'fine']);
  });

  it('숫자와 시각은 단어가 아니다', () => {
    expect(segmentWords('at 3:30').filter((s) => s.word).map((s) => s.text)).toEqual(['at']);
  });

  it('쪼갠 조각을 이어 붙이면 원래 글자가 된다', () => {
    const t = 'Dr. Lee — "okay", 3:30!';
    expect(segmentWords(t).map((s) => s.text).join('')).toBe(t);
  });

  it('빈 글자는 빈 목록', () => {
    expect(segmentWords('')).toEqual([]);
  });
});

describe('normalizeWord', () => {
  it('소문자로 하고 둥근 따옴표를 곧게', () => {
    expect(normalizeWord('Don’t')).toBe("don't");
  });
});
