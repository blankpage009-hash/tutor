import { judgeKeywords, soundsLike, type KeywordJudgement } from './keywordJudge';
import { normalizeText, normalizeToken, sameWord, tokenize } from './normalize';

// 롤플레이 화면용: 들린 말을 정답(예시) 문장 쪽으로 살짝 바로잡는다 (사용자 요청 2026-11-20).
// 작은 인식 모델은 한국어 화자의 발음을 비슷한 다른 단어(work → walk)로 자주 적는다. 판정은 이미
// 비슷한 소리를 인정하는데 화면 글자만 틀려 보여서, 판정과 같은 기준(soundsLike)으로 글자도 맞춘다.
// 판정에는 쓰지 않는다 — 보여 주는 글자만 바꾼다.

export type SnapPart = { text: string; snapped: boolean };

type Scored = SnapPart & { inSentence: boolean };

// 정답 문장에서 바꿔 넣을 수 있는 단어: 축약·숫자처럼 여러 단어로 풀리는 것은 빼고, 한 단어로 풀리는 것만
function snapTargets(expected: string): string[] {
  return tokenize(expected)
    .filter((t) => t.words.length === 1 && t.words[0].forms.length === 1)
    .map((t) => t.words[0].forms[0]);
}

function scoreParts(heard: string, expected: string): Scored[] {
  const exact = normalizeText(expected);
  const targets = snapTargets(expected);
  return heard.split(/\s+/).filter(Boolean).map((text) => {
    const words = normalizeToken(text);
    if (words.length && words.every((w) => exact.some((e) => sameWord(e, w)))) {
      return { text, snapped: false, inSentence: true };
    }
    // 한 단어짜리만 바꾼다. 들린 말이 축약(I'd)처럼 여러 단어로 풀리면 그대로 둔다
    const target = words.length === 1 ? targets.find((t) => soundsLike(t, words[0].forms[0])) : undefined;
    return target ? { text: target, snapped: true, inSentence: true } : { text, snapped: false, inSentence: false };
  });
}

// 들린 말을 단어 하나씩 보며, 정답 문장 단어와 소리가 비슷하면 그 단어로 바꾼다. 한 단어 → 한 단어라
// 띄어쓰기 순서가 그대로여서 키워드 강조(markKeywords)와 번호가 맞는다
export function snapToSentence(heard: string, expected: string): SnapPart[] {
  return scoreParts(heard, expected).map(({ text, snapped }) => ({ text, snapped }));
}

// 후보(자유 인식, 마지막 중간 결과, 정답 단어만 허용한 두 번째 의견) 중 화면에 보여 줄 것.
// ① 키워드를 다 담은 후보 ② 정답 문장 단어를 더 많이 담은 후보 ③ 같으면 앞의 것(자유 인식).
// 그래서 예시와 다른 말로 대답하면 두 번째 의견([unk]투성이)이 아니라 자유 인식 글자가 남는다
export function pickShown(keywords: string[], alternatives: string[], expected: string): string {
  let best = '';
  let bestScore = -1;
  for (const alt of alternatives) {
    const j = judgeKeywords(keywords, [alt]);
    const matched = scoreParts(j.heard, expected).filter((p) => p.inSentence).length;
    const score = (j.pass ? 10000 : 0) + matched;
    if (score > bestScore) {
      best = alt;
      bestScore = score;
    }
  }
  return best;
}

// 롤플레이 판정 + 보여 줄 글자. 통과 여부는 자유 인식 후보(alternatives)로만 정한다.
// 정답 단어만 허용해 다시 들은 글자(hinted)는 정답 쪽으로 끌려가서, 판정에 섞으면 웅얼거림이나
// 다른 대답도 키워드로 바뀌어 통과한다. 그래서 통과했을 때만 hinted까지 보고 화면 글자를 고르고,
// 떨어지면 진짜 잘못 들린 글자를 그대로 보여 준다 (사용자 결정 2026-11-20: 판정은 그대로, 글자만 바로잡기)
export function judgeShown(
  keywords: string[], alternatives: string[], hinted: string | undefined, expected: string
): KeywordJudgement {
  const free = judgeKeywords(keywords, alternatives);
  if (!free.pass || !hinted) return free;
  return judgeKeywords(keywords, [pickShown(keywords, [...alternatives, hinted], expected)]);
}
