import { describe, expect, it } from 'vitest';
import { grammarFor, looseGrammarFor } from './voskEngine';

describe('롤플레이 느슨한 단어 목록', () => {
  it('문장 통째 + 낱말(겹치지 않게) + [unk]', () => {
    expect(looseGrammarFor('I think, I can.')).toEqual(['i think i can', 'i', 'think', 'can', '[unk]']);
  });

  it('한 단어 문장은 겹치지 않는다', () => {
    expect(looseGrammarFor('Sure!')).toEqual(['sure', '[unk]']);
  });
});

describe('인식 엔진에 줄 문장 단어 목록', () => {
  it('소문자로 바꾸고 문장부호를 뺀다', () => {
    expect(grammarFor("Hey, how's it going?")).toEqual(["hey how's it going", '[unk]']);
  });

  it('둥근 따옴표도 곧은 따옴표로 맞춘다', () => {
    expect(grammarFor('I’m good — thanks!')).toEqual(["i'm good thanks", '[unk]']);
  });
});
