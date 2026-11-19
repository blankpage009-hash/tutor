// 문장 글자를 "누를 수 있는 단어"와 나머지(공백·문장부호·숫자)로 쪼개는 순수 함수.
// 단어 = 글자로 시작하고 줄임말(don't)·붙임표(well-known)로 이어진 덩어리. 숫자 "3:30"은 단어가 아니다.
export type Segment = { text: string; word: boolean };

const WORD_RE = /\p{L}+(?:['’-]\p{L}+)*/gu; // café처럼 악센트 글자도 한 단어

export function segmentWords(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD_RE)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), word: false });
    out.push({ text: m[0], word: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), word: false });
  return out;
}

// 저장·검색에 쓰는 모양: 소문자, 둥근 따옴표는 곧은 따옴표로 (판정 모듈과 같은 규칙)
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[‘’]/g, "'");
}
