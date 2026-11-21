import { describe, expect, it } from 'vitest';
import type { VocabWord } from './db/types';
import {
  blankInSentence, cardReducer, clozeWordMatched, initCards, isClozeUsable, isTypedCorrect, pickQuizWords
} from './vocabQuiz';

const w = (id: number, word: string, extra: Partial<VocabWord> = {}): VocabWord => ({
  id, word, meaning: `${word}의 뜻`, pos: 'noun', savedAt: id, ...extra
});

describe('blankInSentence', () => {
  it('그 단어만 밑줄로 가리고 문장부호는 둔다', () => {
    expect(blankInSentence("I'm torn between these two.", 'torn', 0)).toBe("I'm ____ between these two.");
  });

  it('대소문자 무시, 같은 단어가 여러 번 나오면 모두 가린다', () => {
    expect(blankInSentence('Tea or tea?', 'tea', 0)).toBe('___ or ___?');
  });

  it('level 2는 첫 글자를 보여 준다', () => {
    expect(blankInSentence('Hey, how is it going?', 'going', 2)).toBe('Hey, how is it g____?');
  });

  it("줄임말도 가리되 아포스트로피는 남겨 단어 모양이 보이게 (복습 힌트와 같은 방식)", () => {
    expect(blankInSentence("Hey, how's it going?", "how's", 0)).toBe("Hey, ___'_ it going?");
  });

  it('없는 단어면 문장 그대로', () => {
    expect(blankInSentence('Hello there', 'zebra', 0)).toBe('Hello there');
  });
});

describe('isClozeUsable', () => {
  it('출처 문장에 단어가 있어야 한다', () => {
    expect(isClozeUsable(w(1, 'torn', { sourceEn: "I'm torn between these two." }))).toBe(true);
    expect(isClozeUsable(w(2, 'torn', { sourceEn: 'Something else' }))).toBe(false);
    expect(isClozeUsable(w(3, 'torn'))).toBe(false);
  });
});

describe('clozeWordMatched', () => {
  const marks = [
    { text: "I'm", status: 'matched' as const }, { text: 'torn', status: 'missed' as const },
    { text: 'between.', status: 'matched' as const }
  ];
  it('그 단어가 맞혀졌을 때만 true', () => {
    expect(clozeWordMatched(marks, 'torn')).toBe(false);
    expect(clozeWordMatched(marks, 'between')).toBe(true);
  });
});

describe('isTypedCorrect', () => {
  it('대소문자·앞뒤 공백·문장부호를 무시한다', () => {
    expect(isTypedCorrect('  Torn. ', 'torn')).toBe(true);
    expect(isTypedCorrect("DON’T", "don't")).toBe(true);
  });
  it('다르거나 빈 답은 틀림', () => {
    expect(isTypedCorrect('turn', 'torn')).toBe(false);
    expect(isTypedCorrect('   ', 'torn')).toBe(false);
  });
});

describe('pickQuizWords', () => {
  const words = [w(1, 'a1'), w(2, 'b2'), w(3, 'c3'), w(4, 'd4', { meaning: '' })];
  const dueAt = new Map([['2', 100], ['1', 300], ['4', 50]]);

  it('오늘 모드: 때가 된 것만, 밀린 순, 뜻 없는 단어 제외', () => {
    expect(pickQuizWords({ kind: 'card', scope: 'due', words, dueAt }).map((x) => x.id)).toEqual([2, 1]);
  });

  it('랜덤 모드: 때와 상관없이 섞어서 개수 제한', () => {
    const got = pickQuizWords({ kind: 'card', scope: 'random', words, dueAt, limit: 2, rng: () => 0 });
    expect(got).toHaveLength(2);
    expect(got.every((x) => x.id !== 4)).toBe(true);
  });

  it('문장 빈칸 모드는 빈칸을 만들 수 있는 단어만', () => {
    const ws = [w(1, 'torn', { sourceEn: 'I am torn.' }), w(2, 'zebra', { sourceEn: 'No match here' }), w(3, 'x')];
    const all = new Map([['1', 1], ['2', 1], ['3', 1]]);
    expect(pickQuizWords({ kind: 'cloze', scope: 'due', words: ws, dueAt: all }).map((x) => x.id)).toEqual([1]);
  });
});

describe('cardReducer', () => {
  it('탭할 때마다 앞↔뒤로 뒤집힌다', () => {
    let s = initCards(['1', '2']);
    s = cardReducer(s, { type: 'flip' });
    expect(s.flipped).toBe(true);
    s = cardReducer(s, { type: 'flip' });
    expect(s.flipped).toBe(false);
  });

  it('앞면에서도 등급을 매기면 기록하고 다음 카드(앞면)로', () => {
    let s = initCards(['1', '2']);
    s = cardReducer(s, { type: 'grade', grade: 'again' });
    expect(s).toMatchObject({ index: 1, flipped: false, graded: [{ id: '1', grade: 'again' }] });
  });

  it('뒤집은 뒤 등급을 매겨도 다음 카드는 앞면, 끝나면 더 못 움직인다', () => {
    let s = initCards(['1', '2']);
    s = cardReducer(cardReducer(s, { type: 'flip' }), { type: 'grade', grade: 'hard' });
    expect(s).toMatchObject({ index: 1, flipped: false });
    s = cardReducer(s, { type: 'grade', grade: 'good' });
    expect(s.index).toBe(2);
    expect(cardReducer(s, { type: 'flip' })).toBe(s);
  });
});
