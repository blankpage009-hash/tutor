import { normalizeText, normalizeToken, sameWord, type NormWord } from './normalize';

// 롤플레이 자유 답변 판정. 문장 전체를 맞히는 게 아니라 "꼭 넣을 말(키워드)"이 들어갔는지만 본다
// (레슨 rolePlay.passRule: 키워드가 있으면 모두 들어가야 통과, 없으면 말하기만 하면 통과)

export type KeywordHit = { keyword: string; hit: boolean };

export type KeywordJudgement = {
  pass: boolean;
  hits: KeywordHit[];
  heard: string; // 화면에 보여 줄 들린 말 (가장 잘 맞은 후보)
};

// 앱 안 인식은 못 알아들은 소리를 [unk]로 적는다. 그대로 두면 잡음만으로 "말했다"가 되어 버린다
function cleanHeard(text: string): string {
  return text.replace(/\[unk\]/gi, ' ').replace(/\s+/g, ' ').trim();
}

// 어미만 다른 말(works·worked·working)은 같은 말로 본다. 너무 짧은 단어(this)는 떼지 않는다
function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && (w.endsWith('ed') || w.endsWith('es'))) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

// 소리 뼈대: 첫 글자 뒤 모음은 지우고, 한국어 화자가 헷갈리거나 앱 안 인식이 바꿔 듣는 짝(r/l, b/v, p/f)을
// 같게 둔다. 아이폰에서 "work"를 "walk"로 들음 (사용자 결정 2026-11-18: 비슷한 소리 + 어미 변화 인정)
function skeleton(w: string): string {
  const m = stem(w).replace(/ph/g, 'p').replace(/r/g, 'l').replace(/v/g, 'b').replace(/f/g, 'p').replace(/z/g, 's');
  return (m[0] + m.slice(1).replace(/[aeiouy]/g, '')).replace(/(.)\1+/g, '$1');
}

// 두 글자 이하 단어(a, I, me)와 뼈대가 한 글자뿐인 말은 정확히 같아야 한다 — 아무 말이나 걸리지 않게
function soundsLike(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return false;
  const k = skeleton(a);
  return k.length >= 2 && k === skeleton(b);
}

function sameKeyWord(key: NormWord, heard: NormWord): boolean {
  return sameWord(key, heard) || key.forms.some((k) => heard.forms.some((h) => soundsLike(k, h)));
}

// 여러 단어 키워드("if I were you")는 붙어서 이 순서대로 나와야 한다. 단어 단위로 비교해서
// "or"가 "work" 속에 숨어 있어도 걸리지 않는다
function containsRun(heard: NormWord[], key: NormWord[]): boolean {
  if (!key.length) return true;
  for (let i = 0; i + key.length <= heard.length; i++) {
    if (key.every((k, j) => sameKeyWord(k, heard[i + j]))) return true;
  }
  return false;
}

function judgeOne(keywords: string[], heard: string): KeywordJudgement {
  const words = normalizeText(heard);
  const hits = keywords.map((keyword) => ({ keyword, hit: containsRun(words, normalizeText(keyword)) }));
  const pass = words.length > 0 && hits.every((h) => h.hit);
  return { pass, hits, heard };
}

const hitCount = (j: KeywordJudgement) => j.hits.filter((h) => h.hit).length;

// 후보 중 하나라도 통과하면 통과. 아니면 키워드를 가장 많이 담은 후보를 보여 준다
export function judgeKeywords(keywords: string[], alternatives: string[]): KeywordJudgement {
  const candidates = alternatives.map(cleanHeard);
  let best = judgeOne(keywords, candidates[0] ?? '');
  for (const c of candidates.slice(1)) {
    const r = judgeOne(keywords, c);
    if (r.pass && !best.pass) best = r;
    else if (r.pass === best.pass && hitCount(r) > hitCount(best)) best = r;
  }
  return best;
}

export type HeardPart = { text: string; key: boolean };

// 화면용: 들린 말을 띄어쓰기 단위로 나눠, 키워드에 걸린 단어를 표시한다 (디자인 v2 07 ME 카드의 키워드 강조).
// 판정(containsRun)과 같은 비교를 써서, 칩에 ✓가 붙은 키워드만 문장에서도 강조되게 한다
export function markKeywords(keywords: string[], heard: string): HeardPart[] {
  const tokens = heard.split(/\s+/).filter(Boolean);
  // 축약(I'm → I am)은 한 화면 단어가 비교용 단어 여러 개가 되므로, 비교용 단어마다 원래 화면 단어 번호를 붙인다
  const flat = tokens.flatMap((t, tok) => normalizeToken(t).map((word) => ({ word, tok })));
  const marked = new Set<number>();
  for (const k of keywords) {
    const key = normalizeText(k);
    if (!key.length) continue;
    for (let i = 0; i + key.length <= flat.length; i++) {
      if (!key.every((kw, j) => sameKeyWord(kw, flat[i + j].word))) continue;
      for (let j = 0; j < key.length; j++) marked.add(flat[i + j].tok);
    }
  }
  return tokens.map((text, i) => ({ text, key: marked.has(i) }));
}
