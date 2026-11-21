// 보관함 반복 연습의 "중요 단어 가림" 회차에서 가릴 단어 고르기 (순수 함수).
// 저장 문장에는 강세·핵심어 정보가 없어서, 기능어를 빼고 긴 단어를 중요 단어로 본다.
// 무작위로 고르지 않는 이유: 같은 문장은 몇 번을 해도 같은 자리가 가려져야 기억 연습이 된다
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'up', 'as',
  'and', 'or', 'but', 'so', 'if', 'than', 'that', 'this', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'have', 'has', 'had',
  'will', 'would', 'can', 'could', 'should', 'not', "i'm", "it's", "don't", "let's"
]);

const clean = (w: string) => w.toLowerCase().replace(/[^a-z']/g, '');

// 단어 목록 중 가릴 칸의 번호들. 대략 1/3, 최소 1개·최대 3개. 같은 길이면 문장 앞쪽 단어부터
export function pickMaskedIndices(words: string[]): Set<number> {
  const candidates = words
    .map((w, i) => ({ i, w: clean(w) }))
    .filter(({ w }) => w.length >= 3 && !FUNCTION_WORDS.has(w));
  if (candidates.length === 0) return new Set();
  const count = Math.min(3, candidates.length, Math.max(1, Math.round(words.length / 3)));
  const chosen = [...candidates].sort((a, b) => b.w.length - a.w.length || a.i - b.i).slice(0, count);
  return new Set(chosen.map((c) => c.i));
}
