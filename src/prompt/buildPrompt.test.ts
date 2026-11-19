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
  it('항상 같은 칸 제목 순서로 나온다', () => {
    const p = buildPrompt(base);
    const order = ['[Scenario]', '[Target Expressions]', '[Voice Roleplay Rules]', '[Correction & Feedback]']
      .map((h) => p.indexOf(h));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('상황·역할을 넣고 목표 문장은 빈 줄을 빼고 목록으로 넣는다', () => {
    const p = buildPrompt(base);
    expect(p).toContain('- Situation: ordering coffee at a cafe');
    expect(p).toContain('- Your role: a barista (native American English speaker)');
    expect(p).toContain('- My role: a customer');
    expect(p).toContain('- Can I get a latte?');
    expect(p).toContain('- Is that for here or to go?');
    expect(p).toContain('Do NOT say these expressions for me');
  });

  it('바로 교정은 따라 말하기를 유지하고, 끝나고 교정은 신호말을 기다린다', () => {
    const now = buildPrompt({ ...base, correction: 'now' });
    expect(now).toContain('let me repeat it');
    expect(now).toContain('continue the roleplay in character');
    const later = buildPrompt({ ...base, correction: 'later' });
    expect(later).toContain('Do not correct me during the roleplay');
    expect(later).toContain('"Let\'s wrap up" or "피드백 줘"');
  });

  it('피드백 언어에 따라 지시문이 달라진다', () => {
    expect(buildPrompt({ ...base, feedbackLang: 'ko' })).toContain('in Korean');
    expect(buildPrompt({ ...base, feedbackLang: 'en' })).toContain('clear, simple English');
  });

  it('비워 둔 칸은 기본값으로 채운다', () => {
    const p = buildPrompt({ ...base, situation: ' ', partnerRole: '', myRole: '' });
    expect(p).toContain('- Situation: a casual everyday conversation');
    expect(p).toContain('- Your role: a friendly person (native American English speaker)');
    expect(p).toContain('- My role: myself');
  });

  it('문장이 없으면 목표 문장 칸을 통째로 뺀다', () => {
    const p = buildPrompt({ ...base, sentences: [] });
    expect(p).not.toContain('[Target Expressions]');
    expect(p).toContain('[Voice Roleplay Rules]');
  });
});

describe('cleanSentences', () => {
  it('앞뒤 공백을 지우고 빈 줄을 뺀다', () => {
    expect(cleanSentences([' a ', '', '  '])).toEqual(['a']);
  });
});
