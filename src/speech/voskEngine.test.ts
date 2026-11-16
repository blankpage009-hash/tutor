import { describe, expect, it } from 'vitest';
import { grammarFor } from './voskEngine';

describe('인식 엔진에 줄 문장 단어 목록', () => {
  it('소문자로 바꾸고 문장부호를 뺀다', () => {
    expect(grammarFor("Hey, how's it going?")).toEqual(["hey how's it going", '[unk]']);
  });

  it('둥근 따옴표도 곧은 따옴표로 맞춘다', () => {
    expect(grammarFor('I’m good — thanks!')).toEqual(["i'm good thanks", '[unk]']);
  });
});
