import { digitsToWords } from './numbers';

// 비교용 단어 1개. forms 중 하나라도 같으면 같은 단어로 본다.
// 예: "I'd"의 'd는 would일 수도 had일 수도 있어서 forms = ['would', 'had'].
export type NormWord = { forms: string[] };

// 정답 문장의 화면 단어 1개와, 그 단어를 풀어 쓴 비교용 단어들
export type NormToken = { display: string; words: NormWord[] };

const w = (...forms: string[]): NormWord => ({ forms });

// 아이폰 받아쓰기는 축약을 풀어서(should've → should have) 줄 때도, 그대로 줄 때도 있다.
// 그래서 정답과 들린 말을 "둘 다 풀어 쓴 모양"으로 바꿔 비교한다 (schema.md 7절).
const WHOLE: Record<string, NormWord[]> = {
  gonna: [w('going'), w('to')],
  wanna: [w('want'), w('to')],
  gotta: [w('got'), w('to')],
  kinda: [w('kind'), w('of')],
  sorta: [w('sort'), w('of')],
  lemme: [w('let'), w('me')],
  gimme: [w('give'), w('me')],
  dunno: [w('do'), w('not'), w('know')],
  outta: [w('out'), w('of')],
  lotta: [w('lot'), w('of')],
  alright: [w('all'), w('right')],
  ok: [w('okay')],
  cannot: [w('can'), w('not')],
  "can't": [w('can'), w('not')],
  "won't": [w('will'), w('not')],
  "shan't": [w('shall'), w('not')],
  "let's": [w('let'), w('us')],
  lets: [w('let'), w('us')],
  "y'all": [w('you'), w('all')],
  "'em": [w('them')],
  "'cause": [w('because')],
  "o'clock": [w("o'clock")],
  "ma'am": [w("ma'am")]
};

const SUFFIX: [RegExp, NormWord[]][] = [
  [/^(.+)n't$/, [w('not')]],
  [/^(.+)'re$/, [w('are')]],
  [/^(.+)'m$/, [w('am')]],
  [/^(.+)'ll$/, [w('will')]],
  [/^(.+)'ve$/, [w('have')]],
  [/^(.+)'d$/, [w('would', 'had')]],
  // 's는 is/has 축약이거나 소유격(today's)이다. 양쪽을 같은 규칙으로 풀어서 어느 쪽이든 맞게 한다
  [/^(.+)'s$/, [w('is', 'has', "'s")]]
];

function expandWord(word: string): NormWord[] {
  if (WHOLE[word]) return WHOLE[word];
  for (const [re, tail] of SUFFIX) {
    const m = word.match(re);
    if (m) return [w(m[1]), ...tail];
  }
  return [w(word)];
}

function cleanPart(part: string): string {
  // 단어 끝의 홑따옴표는 복수 소유격(kids')이나 인용 부호라 떼어낸다. 'em·'cause는 WHOLE에서 먼저 처리
  const p = part.replace(/[^a-z0-9']/g, '');
  return WHOLE[p] ? p : p.replace(/^'+|'+$/g, '');
}

// 화면 단어 1개("How's", "3:30", "well-known,")를 비교용 단어들로
export function normalizeToken(raw: string): NormWord[] {
  const lower = raw.toLowerCase().replace(/[’‘`]/g, "'").replace(/&/g, 'and');
  const numeric = lower.replace(/^[^0-9$]+|[^0-9%a-z]+$/g, '');
  const num = digitsToWords(numeric);
  if (num) return num.map((x) => w(x));
  const out: NormWord[] = [];
  for (const part of lower.split(/[-–—/]+/)) {
    const clean = cleanPart(part);
    if (clean) out.push(...expandWord(clean));
  }
  return out;
}

export function tokenize(text: string): NormToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((display) => ({ display, words: normalizeToken(display) }));
}

export function normalizeText(text: string): NormWord[] {
  return tokenize(text).flatMap((t) => t.words);
}

export function sameWord(a: NormWord, b: NormWord): boolean {
  return a.forms.some((f) => b.forms.includes(f));
}
