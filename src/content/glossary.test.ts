import { describe, expect, it } from 'vitest';
import { lookupWord, wordCandidates, type GlossaryWords } from './glossary';

const words: GlossaryWords = {
  look: ['보다', 'verb'],
  apple: ['사과', 'noun'],
  bigger: ['더 큰', 'adjective'],
  run: ['달리다', 'verb'],
  study: ['공부하다', 'verb'],
  love: ['사랑하다', 'verb']
};

describe('lookupWord', () => {
  it('그대로 있는 단어는 바로 찾는다 (대소문자 무시)', () => {
    expect(lookupWord(words, 'Apple')).toEqual({ ko: '사과', pos: 'noun' });
  });

  it('복수·3인칭·소유를 걷어 내고 찾는다', () => {
    expect(lookupWord(words, 'apples')?.ko).toBe('사과');
    expect(lookupWord(words, 'looks')?.ko).toBe('보다');
    expect(lookupWord(words, "apple's")?.ko).toBe('사과');
  });

  it('과거·진행형을 걷어 내고 찾는다', () => {
    expect(lookupWord(words, 'looked')?.ko).toBe('보다');
    expect(lookupWord(words, 'looking')?.ko).toBe('보다');
    expect(lookupWord(words, 'studies')?.ko).toBe('공부하다');
    expect(lookupWord(words, 'studied')?.ko).toBe('공부하다');
    expect(lookupWord(words, 'running')?.ko).toBe('달리다');
    expect(lookupWord(words, 'loving')?.ko).toBe('사랑하다');
  });

  it('사전에 자기 항목이 있으면 그것이 먼저', () => {
    expect(lookupWord(words, 'bigger')?.ko).toBe('더 큰');
  });

  it('없는 단어와 Object 기본 이름은 null', () => {
    expect(lookupWord(words, 'zebra')).toBeNull();
    expect(lookupWord(words, 'constructor')).toBeNull();
  });
});

describe('wordCandidates', () => {
  it('첫 후보는 단어 자신', () => {
    expect(wordCandidates('Dogs')[0]).toBe('dogs');
  });
});
