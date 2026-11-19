import { describe, expect, it } from 'vitest';
import { GeminiError } from './geminiClient';
import { parseRoleplay, roleplayRequest, validKeywords } from './tasks';

describe('roleplayRequest', () => {
  it('JSON 응답을 요구하고 상황 힌트를 담는다', () => {
    const r = roleplayRequest('airport check-in');
    expect(r.json).toBe(true);
    expect(r.prompt).toContain('airport check-in');
  });
  it('힌트가 비면 일상 상황으로 시킨다', () => {
    expect(roleplayRequest('  ').prompt).toContain('everyday');
  });
});

describe('validKeywords', () => {
  it('예시 답에 없는 말은 버리고, 대소문자·문장부호는 무시한다', () => {
    expect(validKeywords(['Latte', 'pizza', 'to go'], 'Can I get a latte, to go?')).toEqual(['Latte', 'to go']);
  });
  it('단어의 일부만 겹치는 말은 키워드가 아니다', () => {
    expect(validKeywords(['or'], 'I work here')).toEqual([]);
  });
  it('3개까지만, 배열이 아니면 빈 목록', () => {
    expect(validKeywords(['a', 'b', 'c', 'd'], 'a b c d')).toHaveLength(3);
    expect(validKeywords('x', 'x')).toEqual([]);
  });
});

const GOOD = {
  title: '카페', situation: '카페에서 주문해요', partnerRole: '점원',
  lines: [
    { speaker: 'partner', en: 'Hi! What can I get you?', ko: '어서 오세요' },
    { speaker: 'me', exampleEn: 'Can I get a latte?', exampleKo: '라떼 주세요', requiredKeywords: ['latte', 'tea'] },
    { speaker: 'partner', en: 'For here or to go?', ko: '드시고 가세요?' },
    { speaker: 'me', exampleEn: 'To go, please.', exampleKo: '가져갈게요', requiredKeywords: [] }
  ]
};

describe('parseRoleplay', () => {
  it('줄 번호를 1부터 매기고 상대 줄은 음성 없음, 지어낸 키워드는 뺀다', () => {
    const rp = parseRoleplay(JSON.stringify(GOOD));
    expect(rp.partnerRole).toBe('점원');
    expect(rp.lines.map((l) => l.no)).toEqual([1, 2, 3, 4]);
    const first = rp.lines[0];
    expect(first.speaker === 'partner' && first.audio).toBe('');
    const mine = rp.lines[1];
    expect(mine.speaker === 'me' && mine.requiredKeywords).toEqual(['latte']);
  });

  it('알 수 없는 줄은 건너뛰고 10줄까지만 쓴다', () => {
    const many = { ...GOOD, lines: [...GOOD.lines, { speaker: 'x' }, ...GOOD.lines, ...GOOD.lines, ...GOOD.lines] };
    const rp = parseRoleplay(JSON.stringify(many));
    expect(rp.lines.length).toBeLessThanOrEqual(10);
    expect(rp.lines.every((l) => l.no > 0)).toBe(true);
  });

  it('내 줄이 없거나 상대 줄이 없으면 오류다', () => {
    const onlyPartner = { ...GOOD, lines: [GOOD.lines[0], GOOD.lines[2]] };
    const onlyMe = { ...GOOD, lines: [GOOD.lines[1], GOOD.lines[3]] };
    expect(() => parseRoleplay(JSON.stringify(onlyPartner))).toThrow(GeminiError);
    expect(() => parseRoleplay(JSON.stringify(onlyMe))).toThrow(GeminiError);
    expect(() => parseRoleplay('{"lines":"nope"}')).toThrow(GeminiError);
  });
});
