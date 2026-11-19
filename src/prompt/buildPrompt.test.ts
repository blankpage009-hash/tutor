import { describe, expect, it } from 'vitest';
import { buildPrompt, cleanSentences, type PromptOptions } from './buildPrompt';

const base: PromptOptions = {
  situation: 'ordering coffee at a cafe',
  partnerRole: 'a barista',
  myRole: 'a customer',
  sentences: ['Can I get a latte?', '  ', 'Is that for here or to go?'],
  correction: 'later',
  feedbackLang: 'ko'
};

describe('buildPrompt', () => {
  it('상황·역할을 넣고 문장에 번호를 매기며 빈 줄은 뺀다', () => {
    const p = buildPrompt(base);
    expect(p).toContain('Situation: ordering coffee at a cafe');
    expect(p).toContain('Your role: a barista');
    expect(p).toContain('My role: a customer');
    expect(p).toContain('1. Can I get a latte?');
    expect(p).toContain('2. Is that for here or to go?');
    expect(p).not.toContain('3.');
  });

  it('교정 방식에 따라 지시문이 달라진다', () => {
    expect(buildPrompt({ ...base, correction: 'now' })).toContain('correct me right away');
    expect(buildPrompt({ ...base, correction: 'later' })).toContain('Do not interrupt me');
  });

  it('피드백 언어에 따라 지시문이 달라진다', () => {
    expect(buildPrompt({ ...base, feedbackLang: 'ko' })).toContain('in Korean');
    expect(buildPrompt({ ...base, feedbackLang: 'en' })).toContain('simple English');
  });

  it('비워 둔 칸은 기본값으로 채운다', () => {
    const p = buildPrompt({ ...base, situation: ' ', partnerRole: '', myRole: '' });
    expect(p).toContain('a casual everyday conversation');
    expect(p).toContain('a friendly native American English speaker');
    expect(p).toContain('My role: myself');
  });

  it('문장이 없으면 목표 문장 항목을 통째로 뺀다', () => {
    const p = buildPrompt({ ...base, sentences: [] });
    expect(p).not.toContain('Target sentences');
    expect(p).not.toContain('target sentence');
  });
});

describe('cleanSentences', () => {
  it('앞뒤 공백을 지우고 빈 줄을 뺀다', () => {
    expect(cleanSentences([' a ', '', '  '])).toEqual(['a']);
  });
});
