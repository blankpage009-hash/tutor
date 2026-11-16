import { normalizeText, sameWord, tokenize, type NormWord } from './normalize';
import type { Judge, Judgement, WordMark } from './types';

// 정답 단어열과 들린 단어열에서 "순서를 지키며 겹치는 단어"(최장 공통 부분열)를 찾는다.
// 그냥 단어가 포함됐는지만 보면 순서를 뒤섞어 말해도 통과되기 때문.
// 반환값: 정답 단어 하나하나가 맞았는지
export function alignWords(target: NormWord[], heard: NormWord[]): boolean[] {
  const n = target.length;
  const m = heard.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = sameWord(target[i], heard[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Array<boolean>(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (sameWord(target[i], heard[j]) && dp[i][j] === dp[i + 1][j + 1] + 1) {
      matched[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return matched;
}

// 화면 단어 단위로 점수를 낸다. "How's"처럼 풀면 두 단어인 것은 반만 맞으면 0.5점.
// 문장부호뿐인 토큰(—)은 점수 계산에서 뺀다.
function scoreOne(target: string, heard: string): Judgement {
  const tokens = tokenize(target);
  const flat = tokens.flatMap((t) => t.words);
  const hits = alignWords(flat, normalizeText(heard));
  let k = 0;
  let points = 0;
  let counted = 0;
  const words: WordMark[] = tokens.map((t) => {
    const own = hits.slice(k, k + t.words.length);
    k += t.words.length;
    if (own.length === 0) return { text: t.display, status: 'matched' };
    counted++;
    points += own.filter(Boolean).length / own.length;
    return { text: t.display, status: own.every(Boolean) ? 'matched' : 'missed' };
  });
  return { ratio: counted ? points / counted : 0, words, nextIndex: findNext(words), heard };
}

// 마지막으로 맞힌 단어 다음의 첫 못 맞힌 단어. 사용자가 지금 말해야 할 곳
function findNext(words: WordMark[]): number {
  let last = -1;
  words.forEach((wd, i) => {
    if (wd.status === 'matched') last = i;
  });
  const after = words.findIndex((wd, i) => i > last && wd.status === 'missed');
  if (after >= 0) return after;
  return words.findIndex((wd) => wd.status === 'missed');
}

export const wordMatchJudge: Judge = {
  judge(target, alternatives) {
    const candidates = alternatives.length ? alternatives : [''];
    let best = scoreOne(target, candidates[0]);
    for (const alt of candidates.slice(1)) {
      const r = scoreOne(target, alt);
      if (r.ratio > best.ratio) best = r;
    }
    return best;
  }
};
