// 단어 퀴즈의 순수 계산: 퀴즈에 낼 단어 고르기, 문장 빈칸 만들기, 쓴 답 채점, 카드 뒤집기 진행.
// 말하기 퀴즈(뜻→영어·문장 빈칸)의 카드 진행·힌트·등급은 문장 복습의 reviewReducer를 그대로 쓴다.
import type { VocabWord } from './db/types';
import { shuffle, type GradedCard } from './reviewPlan';
import type { WordMark } from './scoring/types';
import type { Grade } from './srs';
import { normalizeWord, segmentWords } from './wordTap';

export const QUIZ_BATCH = 10; // 한 판에 푸는 단어 수 (문장 복습과 같다)

export type QuizKind = 'card' | 'write' | 'cloze';
export type QuizScope = 'due' | 'random';

export const QUIZ_KINDS: QuizKind[] = ['card', 'write', 'cloze'];
export const isQuizKind = (v: string | null): v is QuizKind => QUIZ_KINDS.includes(v as QuizKind);

// ── 문장 빈칸 ─────────────────────────────────────────────
function matches(segText: string, word: string): boolean {
  return normalizeWord(segText) === word;
}

// 출처 문장 안에 그 단어가 정말 있어야 빈칸을 만들 수 있다 (예전에 글자 없이 저장됐거나 문장이 바뀐 경우를 거른다)
export function isClozeUsable(w: Pick<VocabWord, 'word' | 'sourceEn'>): boolean {
  return Boolean(w.sourceEn) && segmentWords(w.sourceEn!).some((s) => s.word && matches(s.text, w.word));
}

// level 0·1 = 전부 밑줄, 2 = 첫 글자만 보임. 같은 단어가 여러 번 나오면 모두 가린다
export function blankInSentence(en: string, word: string, level: 0 | 1 | 2): string {
  return segmentWords(en)
    .map((s) => {
      if (!s.word || !matches(s.text, word)) return s.text;
      const blanks = s.text.replace(/\p{L}/gu, '_');
      return level === 2 ? s.text[0] + blanks.slice(1) : blanks;
    })
    .join('');
}

// 문장 전체를 말했을 때: 문장이 통과 기준을 넘어도 빈칸의 그 단어를 못 맞혔으면 틀린 것이다
export function clozeWordMatched(marks: WordMark[], word: string): boolean {
  return marks.some((m) => m.status === 'matched' && segmentWords(m.text).some((s) => s.word && matches(s.text, word)));
}

// ── 쓴 답 채점 ────────────────────────────────────────────
function normalizeTyped(text: string): string {
  return normalizeWord(text).replace(/[^a-z0-9'\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isTypedCorrect(input: string, word: string): boolean {
  const typed = normalizeTyped(input);
  return typed.length > 0 && typed === normalizeTyped(word);
}

// ── 퀴즈에 낼 단어 고르기 ─────────────────────────────────
type PickInput = {
  kind: QuizKind;
  scope: QuizScope;
  words: VocabWord[];
  dueAt: ReadonlyMap<string, number>; // 복습 달력에서 때가 된 단어: 단어 번호(글자) → 복습 시각
  limit?: number;
  rng?: () => number;
};

export function pickQuizWords({ kind, scope, words, dueAt, limit = QUIZ_BATCH, rng = Math.random }: PickInput): VocabWord[] {
  const usable = words.filter((w) => w.id !== undefined && w.meaning && (kind !== 'cloze' || isClozeUsable(w)));
  if (scope === 'random') return shuffle(usable, rng).slice(0, limit);
  return usable
    .filter((w) => dueAt.has(String(w.id)))
    .sort((a, b) => (dueAt.get(String(a.id)) ?? 0) - (dueAt.get(String(b.id)) ?? 0))
    .slice(0, limit);
}

// ── 카드 뒤집기 퀴즈 진행 ─────────────────────────────────
export type CardState = { ids: string[]; index: number; flipped: boolean; graded: GradedCard[] };
export type CardAction = { type: 'flip' } | { type: 'grade'; grade: Grade };

export function initCards(ids: string[]): CardState {
  return { ids, index: 0, flipped: false, graded: [] };
}

export const cardsFinished = (s: CardState) => s.index >= s.ids.length;

// 뒤집어 보기 전에는 등급을 못 매긴다 (뜻을 안 보고 "알아요"만 누르는 실수 방지)
export function cardReducer(s: CardState, a: CardAction): CardState {
  if (cardsFinished(s)) return s;
  if (a.type === 'flip') return s.flipped ? s : { ...s, flipped: true };
  if (!s.flipped) return s;
  return { ...s, index: s.index + 1, flipped: false, graded: [...s.graded, { id: s.ids[s.index], grade: a.grade }] };
}
