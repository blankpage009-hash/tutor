import { normalizeText, sameWord, type NormWord } from './normalize';

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

// 여러 단어 키워드("if I were you")는 붙어서 이 순서대로 나와야 한다. 단어 단위로 비교해서
// "or"가 "work" 속에 숨어 있어도 걸리지 않는다
function containsRun(heard: NormWord[], key: NormWord[]): boolean {
  if (!key.length) return true;
  for (let i = 0; i + key.length <= heard.length; i++) {
    if (key.every((k, j) => sameWord(k, heard[i + j]))) return true;
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
