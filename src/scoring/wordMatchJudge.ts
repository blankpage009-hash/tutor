import { soundsLike } from './keywordJudge';
import { normalizeText, sameWord, tokenize, type NormToken, type NormWord } from './normalize';
import type { Judge, Judgement, WordMark } from './types';

type SameFn = (a: NormWord, b: NormWord) => boolean;

// 정답 단어열과 들린 단어열에서 "순서를 지키며 겹치는 단어"(최장 공통 부분열)를 찾는다.
// 그냥 단어가 포함됐는지만 보면 순서를 뒤섞어 말해도 통과되기 때문.
// 반환값: 정답 단어 하나하나가 맞았는지
export function alignWords(target: NormWord[], heard: NormWord[], same: SameFn = sameWord): boolean[] {
  const n = target.length;
  const m = heard.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = same(target[i], heard[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Array<boolean>(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (same(target[i], heard[j]) && dp[i][j] === dp[i + 1][j + 1] + 1) {
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
// 화면 단어(토큰)마다, 풀어 쓴 비교용 단어들이 하나하나 맞았는지. 문장부호뿐인 토큰은 빈 배열
function tokenHits(tokens: NormToken[], heard: string, same?: SameFn): boolean[][] {
  const hits = alignWords(tokens.flatMap((t) => t.words), normalizeText(heard), same);
  let k = 0;
  return tokens.map((t) => {
    const own = hits.slice(k, k + t.words.length);
    k += t.words.length;
    return own;
  });
}

function scoreOne(target: string, heard: string): Judgement {
  const tokens = tokenize(target);
  const perToken = tokenHits(tokens, heard);
  let points = 0;
  let counted = 0;
  const words: WordMark[] = tokens.map((t, i) => {
    const own = perToken[i];
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

// 한 번 말하는 동안 화면에 칠할 단어: 앞서 한 번이라도 맞힌 단어는 계속 맞힘으로 둔다.
// 인식기가 말하는 도중 앞부분을 고쳐 쓰면("torn"→"tom") 칠해졌던 단어가 지워져서다 (사용자 요청 2026-11-20).
// 화면 표시용일 뿐 점수(ratio)는 그대로 둔다
export function keepMatched(prev: WordMark[] | null, now: Judgement): Judgement {
  if (!prev || prev.length !== now.words.length) return now;
  const words = now.words.map((w, i) => (prev[i].status === 'matched' ? { ...w, status: 'matched' as const } : w));
  return { ...now, words, nextIndex: findNext(words) };
}

// 말하는 중 화면 표시용: 소리가 비슷한 단어(work↔walk)도 맞힌 것으로 본다. 최종 판정은 "문장 단어만 허용"으로
// 한 번 더 들어 이런 단어를 바로잡는데, 말하는 동안엔 그게 없어 빈칸이 생겨서다 (사용자 요청 2026-11-21)
const soundsSame: SameFn = (a, b) => sameWord(a, b) || a.forms.some((f) => b.forms.some((h) => soundsLike(f, h)));

// 소리 비슷 맞힘 + 앞으로 채우기: 가장 뒤에 맞힌 단어까지 그 앞을 모두 칠한다. 짧은 단어(a·to)는
// 소리 비교가 안 되고 인식기가 자주 빠뜨려서다. 문장부호뿐인 토큰은 "맞힌 단어"로 세지 않는다
function liveOne(target: string, heard: string): { words: WordMark[]; hits: number } {
  const tokens = tokenize(target);
  const perToken = tokenHits(tokens, heard, soundsSame);
  const hit = perToken.map((own) => own.length > 0 && own.some(Boolean));
  const last = hit.lastIndexOf(true);
  const words: WordMark[] = tokens.map((t, i) => ({
    text: t.display,
    status: i <= last || perToken[i].length === 0 ? 'matched' : 'missed'
  }));
  return { words, hits: hit.filter(Boolean).length };
}

// 화면 표시용 판정. 점수(ratio)·들린 말은 엄격한 판정 값 그대로라 통과 여부에는 영향이 없다
export function liveJudge(target: string, alternatives: string[]): Judgement {
  const strict = wordMatchJudge.judge(target, alternatives);
  let best = liveOne(target, '');
  for (const alt of alternatives) {
    const r = liveOne(target, alt);
    if (r.hits > best.hits) best = r;
  }
  return { ...strict, words: best.words, nextIndex: findNext(best.words) };
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
