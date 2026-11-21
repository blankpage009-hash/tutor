import { describe, expect, it } from 'vitest';
import {
  contextSense, lookupEntry, meaningForSave, naverUrl, phraseInSentence, phraseLabel, sentenceKey, type Dictionary,
} from './dictionary';

const dict: Dictionary = {
  entries: {
    go: {
      ipa: 'ɡoʊ',
      audio: 'audio/dict/go-test.m4a',
      forms: { '3s': 'goes', past: 'went', pp: 'gone', ing: 'going' },
      senses: [{ pos: 'verb', ko: '가다' }, { pos: 'verb', ko: '(일이) 진행되다' }],
      phrases: [{ en: 'go out', ko: '외출하다' }],
    },
    child: { forms: { pl: 'children' }, senses: [{ pos: 'noun', ko: '아이' }] },
    find: { forms: { past: 'found', pp: 'found' }, senses: [{ pos: 'verb', ko: '찾다' }] },
    leave: { forms: { past: 'left', pp: 'left' }, senses: [{ pos: 'verb', ko: '떠나다' }] },
    left: { senses: [{ pos: 'noun', ko: '왼쪽' }] },
    look: { senses: [{ pos: 'verb', ko: '보다' }] },
    torn: {
      senses: [{ pos: 'adjective', ko: '찢어진' }, { pos: 'adjective', ko: '(둘 중에) 고민하는' }],
      phrases: [{ en: 'torn between something', ko: '~ 사이에서 고민하다' }],
    },
  },
  forms: { goes: 'go', went: 'go', gone: 'go', going: 'go', children: 'child', found: 'find', left: 'leave' },
  context: {
    "i'm torn between these two.": { torn: 1 },
    'i left early.': { left: 'leave:0' },
  },
};

describe('lookupEntry', () => {
  it('표제어를 그대로 찾는다 (대소문자 무시)', () => {
    expect(lookupEntry(dict, 'Go')?.head).toBe('go');
    expect(lookupEntry(dict, 'Go')?.formOf).toBeUndefined();
  });

  it('불규칙 변화형은 원래 단어로 찾고 어떤 변화형인지 알려 준다', () => {
    expect(lookupEntry(dict, 'went')).toMatchObject({ head: 'go', formOf: ['past'] });
    expect(lookupEntry(dict, 'children')).toMatchObject({ head: 'child', formOf: ['pl'] });
    expect(lookupEntry(dict, 'found')?.formOf).toEqual(['past', 'pp']);
  });

  it('규칙 변화는 걷어 내고 찾는다', () => {
    expect(lookupEntry(dict, 'looked')?.head).toBe('look');
    expect(lookupEntry(dict, 'looking')?.head).toBe('look');
  });

  it('그 자체로도 단어이고 다른 단어의 변화형이면 둘 다 알려 준다', () => {
    expect(lookupEntry(dict, 'left')).toMatchObject({ head: 'left', alsoFormOf: 'leave' });
  });

  it('없는 단어는 null', () => {
    expect(lookupEntry(dict, 'zebra')).toBeNull();
  });
});

describe('발음 음성', () => {
  it('변화형을 눌러도 표제어 발음 파일이 온다 (went → go 소리)', () => {
    expect(lookupEntry(dict, 'went')?.entry.audio).toBe('audio/dict/go-test.m4a');
  });
});

describe('contextSense', () => {
  it('문장 글자로 이 문장에서의 뜻 번호를 찾는다 (따옴표·공백·대소문자 무시)', () => {
    expect(contextSense(dict, 'I’m torn  between these two.', 'torn')?.index).toBe(1);
  });

  it('"leave:0"처럼 다른 단어를 가리키면 그 단어로 바꾼다', () => {
    const c = contextSense(dict, 'I left early.', 'left');
    expect(c?.hit.head).toBe('leave');
    expect(c?.hit.formOf).toEqual(['past', 'pp']);
    expect(c?.index).toBe(0);
  });

  it('문장이나 단어가 적혀 있지 않으면 null', () => {
    expect(contextSense(dict, 'Something else.', 'torn')).toBeNull();
    expect(contextSense(dict, "I'm torn between these two.", 'two')).toBeNull();
  });
});

describe('phraseInSentence', () => {
  it('변화형으로 쓰인 표현도 찾는다 (went out → go out)', () => {
    const hit = lookupEntry(dict, 'went')!;
    expect(phraseInSentence(hit, 'We went out last night.')?.en).toBe('go out');
  });

  it('someone·something 자리는 아무 말이나 들어가도 된다', () => {
    const hit = lookupEntry(dict, 'torn')!;
    expect(phraseInSentence(hit, "I'm torn between these two.")?.ko).toBe('~ 사이에서 고민하다');
  });

  it('단어 일부만 겹치면 표현으로 치지 않는다', () => {
    const hit = lookupEntry(dict, 'go')!;
    expect(phraseInSentence(hit, 'I go outside.')).toBeNull();
  });
});

it('meaningForSave: 괄호 설명을 빼고, 다 빠지면 원래 글자', () => {
  expect(meaningForSave('(be torn between) 둘 사이에서 고민하는, 못 고르는')).toBe('둘 사이에서 고민하는, 못 고르는');
  expect(meaningForSave('찢어진 (tear의 과거분사)')).toBe('찢어진');
  expect(meaningForSave('(일이) 진행되다')).toBe('진행되다');
  expect(meaningForSave('(a.m.의 a)')).toBe('(a.m.의 a)');
});

it('phraseLabel: 자리 표시 단어를 ~로', () => {
  expect(phraseLabel('torn between something')).toBe('torn between ~');
  expect(phraseLabel("catch someone's eye")).toBe("catch ~'s eye");
});

it('sentenceKey·naverUrl', () => {
  expect(sentenceKey('  Hi  THERE ')).toBe('hi there');
  expect(naverUrl("Don’t")).toBe("https://en.dict.naver.com/#/search?query=don't");
});
