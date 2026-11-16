import { describe, expect, it } from 'vitest';
import { digitsToWords } from './numbers';
import { isPass } from './types';
import { wordMatchJudge } from './wordMatchJudge';

const judge = (target: string, ...heard: string[]) => wordMatchJudge.judge(target, heard);

describe('축약 양방향 (콘텐츠 실제 문장)', () => {
  it("how's ↔ how is (beg-01-s1)", () => {
    expect(judge("Hey, how's it going?", 'hey how is it going').ratio).toBe(1);
    expect(judge("Hey, how's it going?", "Hey how's it going").ratio).toBe(1);
  });

  it("gonna ↔ going to, I'm ↔ I am (beg-08-s2)", () => {
    expect(judge("I'm gonna stay home and relax.", 'I am going to stay home and relax').ratio).toBe(1);
    expect(judge("I'm going to stay home and relax.", "I'm gonna stay home and relax").ratio).toBe(1);
  });

  it('wanna ↔ want to (beg-15-s1)', () => {
    expect(judge('Do you wanna come with us?', 'do you want to come with us').ratio).toBe(1);
  });

  it("I'd은 would도 had도 받는다, can't ↔ cannot (beg-16-s1)", () => {
    const t = "I'd love to, but I can't.";
    expect(judge(t, 'I would love to but I cannot').ratio).toBe(1);
    expect(judge(t, "I'd love to but I can not").ratio).toBe(1);
    expect(judge("I'd already left.", 'I had already left').ratio).toBe(1);
  });

  it("should've ↔ should have (int-10-s1)", () => {
    const t = "I should've left the house a little earlier.";
    expect(judge(t, 'I should have left the house a little earlier').ratio).toBe(1);
  });

  it("it's ↔ it is / it has (int-18-s1)", () => {
    expect(judge("Hang in there, it's gonna get better.", 'hang in there it is going to get better').ratio).toBe(1);
    expect(judge("It's been a while.", 'it has been a while').ratio).toBe(1);
  });

  it("won't ↔ will not, she's ↔ she is (mas-16-s3)", () => {
    const t = "She won't admit it, but it's pretty obvious she's upset.";
    expect(judge(t, 'she will not admit it but it is pretty obvious she is upset').ratio).toBe(1);
  });

  it("let's ↔ let us, 소유격 today's (biz-03)", () => {
    expect(judge("Thank you all for joining, let's get started.", 'thank you all for joining let us get started').ratio).toBe(1);
    expect(judge("Let's quickly go over today's agenda before we begin.", "let's quickly go over today's agenda before we begin").ratio).toBe(1);
  });

  it('OK ↔ okay, alright ↔ all right', () => {
    expect(judge("I'd rather stay in tonight, if that's okay.", "I'd rather stay in tonight if that's OK").ratio).toBe(1);
    expect(judge('Alright, see you then.', 'all right see you then').ratio).toBe(1);
  });

  it('곱은 따옴표(’)도 같은 축약으로 본다', () => {
    expect(judge('I’m fine.', "I'm fine").ratio).toBe(1);
  });
});

describe('숫자', () => {
  it('들린 숫자를 글자로 바꾼다', () => {
    expect(digitsToWords('3')).toEqual(['three']);
    expect(digitsToWords('25')).toEqual(['twenty', 'five']);
    expect(digitsToWords('3:30')).toEqual(['three', 'thirty']);
    expect(digitsToWords('7:05')).toEqual(['seven', 'oh', 'five']);
    expect(digitsToWords('$20')).toEqual(['twenty', 'dollars']);
    expect(digitsToWords('1st')).toEqual(['first']);
    expect(digitsToWords('22nd')).toEqual(['twenty', 'second']);
    expect(digitsToWords('hello')).toBeNull();
  });

  it('문장 안의 숫자도 맞힌다', () => {
    expect(judge('See you at three thirty.', 'see you at 3:30').ratio).toBe(1);
    expect(judge("I've got two kids.", 'I have got 2 kids').ratio).toBe(1);
  });
});

describe('판정', () => {
  it('대소문자와 문장부호는 무시한다', () => {
    expect(judge('Hey, how are you?', 'HEY HOW ARE YOU').ratio).toBe(1);
  });

  it('빠진 단어를 표시하고 다음 단어 위치를 알려준다', () => {
    const r = judge('I need to grab a coffee.', 'I need to');
    expect(r.ratio).toBe(0.5);
    expect(r.words.map((x) => x.status)).toEqual(['matched', 'matched', 'matched', 'missed', 'missed', 'missed']);
    expect(r.nextIndex).toBe(3);
  });

  it('순서를 뒤섞으면 점수가 낮다', () => {
    expect(judge('one two three four', 'four three two one').ratio).toBe(0.25);
  });

  it('여러 후보 중 가장 잘 맞는 것으로 판정한다', () => {
    const r = judge('I need a break.', 'I need a brake', 'I need a break');
    expect(r.ratio).toBe(1);
    expect(r.heard).toBe('I need a break');
  });

  it('아무것도 안 들리면 0점', () => {
    expect(wordMatchJudge.judge('Hello there.', []).ratio).toBe(0);
  });

  it('통과 기준 경계: 5단어 중 4개 = 80% 통과', () => {
    const r = judge('one two three four five', 'one two three four');
    expect(isPass(r, 0.8)).toBe(true);
    expect(isPass(judge('one two three four five', 'one two three'), 0.8)).toBe(false);
  });

  it('다 맞히면 다음 단어 위치는 -1', () => {
    expect(judge('Thanks a lot.', 'thanks a lot').nextIndex).toBe(-1);
  });
});

// 콘텐츠 600문장 전체가 "그대로 말했을 때"와 "축약을 풀어 말했을 때" 모두 100%가 나와야 한다.
// 아이폰 받아쓰기가 축약을 풀어서 돌려주는 경우가 많기 때문 (schema.md 7절)
function spellOut(en: string): string {
  return en
    .replace(/\bgonna\b/gi, 'going to')
    .replace(/\bwanna\b/gi, 'want to')
    .replace(/\bcan't\b/gi, 'can not')
    .replace(/\bwon't\b/gi, 'will not')
    .replace(/n't\b/gi, ' not')
    .replace(/'re\b/gi, ' are')
    .replace(/'m\b/gi, ' am')
    .replace(/'ll\b/gi, ' will')
    .replace(/'ve\b/gi, ' have')
    .replace(/'d\b/gi, ' would')
    .replace(/\blet's\b/gi, 'let us')
    .replace(/(\w)'s\b/gi, '$1 is');
}

// 별도 패키지(@types/node) 없이 Vite 기능으로 코스 파일 전부를 읽는다
type CourseLike = { lessons: { sentences: { en: string; variations: { en: string }[] }[] }[] };
const courses = import.meta.glob<CourseLike>('../../content/courses/*.json', { eager: true, import: 'default' });

function allSentences(): string[] {
  return Object.values(courses).flatMap((c) =>
    c.lessons.flatMap((l) => l.sentences.flatMap((s) => [s.en, ...s.variations.map((v) => v.en)])));
}

describe('콘텐츠 전체', () => {
  const sentences = allSentences();

  it('문장이 충분히 있다', () => {
    expect(sentences.length).toBeGreaterThan(2000);
  });

  it('그대로 말하면 모두 100%', () => {
    const bad = sentences.filter((s) => judge(s, s).ratio !== 1);
    expect(bad).toEqual([]);
  });

  it('축약을 풀어 말해도 모두 100%', () => {
    const bad = sentences.filter((s) => judge(s, spellOut(s)).ratio !== 1);
    expect(bad).toEqual([]);
  });
});
