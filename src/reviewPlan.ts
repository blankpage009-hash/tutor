// 복습(한국어 → 영어 말하기)의 순수 계산: 빈칸 힌트, 점수 → 등급, 복습할 문장 고르기, 카드 진행 상태.
// 화면·마이크·DB와 떼어 두어 테스트로 확인한다.
import type { SavedSentence } from './db/types';
import type { Grade } from './srs';

export const REVIEW_BATCH = 10; // 한 번에 하는 문장 수 (설정의 일일 목표 기본값과 같다)
export const MAX_FAILS = 3; // 같은 문장에서 이만큼 틀리면 정답을 보여 주고 "모름"으로 처리

// ── 빈칸 힌트 ─────────────────────────────────────────────
// 짧은 말(a, to, I…)은 보여 주고 핵심 단어만 가린다
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'but', 'is', 'am', 'are', 'was', 'were',
  'be', 'been', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'this', 'that', 'do', 'does', 'did', 'can', 'will', 'would', 'could', 'should', 'not', 'so', 'if', 'as', 'by',
  'from', 'up', 'there', 'here', 'what', 'how', 'who', 'when', 'where', 'why', 'let', 'us', 'them', 'him',
  // 줄임말 앞부분 (don't, isn't, can't …)
  'don', 'can', 'won', 'isn', 'aren', 'doesn', 'didn', 'wasn', 'weren', 'couldn', 'wouldn', 'shouldn', 'haven', 'hasn'
]);

// 0 = 한국어만. 단어 퀴즈(최대 2): 1 = 핵심 단어 빈칸, 2 = 빈칸에 첫 글자.
// 문장 복습(최대 3, reviewHintText): 1 = 단어마다 첫 글자, 2 = 첫 글자 + 글자 수, 3 = 짧은 말은 다 보임
export type HintLevel = 0 | 1 | 2 | 3;

type Piece = { before: string; core: string; after: string };

function splitToken(token: string): Piece {
  const m = token.match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/);
  return { before: m?.[1] ?? '', core: m?.[2] ?? token, after: m?.[3] ?? '' };
}

function isKeyWord(core: string): boolean {
  const lower = core.toLowerCase().replace(/[’‘`]/g, "'");
  const base = lower.split("'")[0];
  return base.length > 2 && !FUNCTION_WORDS.has(base) && !FUNCTION_WORDS.has(lower);
}

function blank(core: string, firstLetter: boolean): string {
  // 글자·숫자만 밑줄로 바꾸고 줄임표(')와 붙임표(-)는 남겨 단어 모양이 보이게 한다
  const masked = core.replace(/[A-Za-z0-9]/g, '_');
  return firstLetter ? core[0] + masked.slice(1) : masked;
}

// 힌트 단계에 맞게 문장을 가려서 보여 줄 글자로 만든다
export function maskText(en: string, level: HintLevel): string {
  if (level === 0) return '';
  const pieces = en.split(/\s+/).filter(Boolean).map(splitToken);
  let hide = pieces.map((p) => isKeyWord(p.core));
  if (!hide.includes(true) && pieces.length > 0) {
    // 핵심 단어가 하나도 없으면(예: "I am so sorry"는 sorry가 있지만 "Is it you?"는 없다) 가장 긴 단어를 가린다
    const longest = pieces.reduce((best, p, i) => (p.core.length > pieces[best].core.length ? i : best), 0);
    hide = pieces.map((_, i) => i === longest);
  }
  const first = level >= 2;
  return pieces.map((p, i) => (hide[i] ? `${p.before}${blank(p.core, first)}${p.after}` : `${p.before}${p.core}${p.after}`)).join(' ');
}

// 문장 복습의 힌트 3단계 (디자인 v2 08: "M w b f m"). 한 단계마다 조금씩 더 보여 준다:
// 1 = 단어마다 첫 글자만(길이도 숨김) → 2 = 첫 글자 + 나머지 글자 수만큼 밑줄 → 3 = 짧은 말(for, me…)은 다 보이고 핵심 단어만 2처럼
export function reviewHintText(en: string, level: HintLevel): string {
  if (level === 0) return '';
  if (level >= 3) return maskText(en, 2);
  const pieces = en.split(/\s+/).filter(Boolean).map(splitToken).filter((p) => p.core);
  if (level === 1) return pieces.map((p) => p.core[0]).join(' ');
  return pieces.map((p) => `${p.before}${blank(p.core, true)}${p.after}`).join(' ');
}

// ── 등급 ─────────────────────────────────────────────────
// 힌트 없이 한 번에 통과 = 좋음, 힌트를 쓰거나 틀렸다가 통과 = 어려움, 정답을 봤거나 3번 틀림 = 모름
export function gradeFor(passed: boolean, hint: HintLevel, fails: number): Grade {
  if (!passed) return 'again';
  return hint === 0 && fails === 0 ? 'good' : 'hard';
}

// ── 복습할 문장 고르기 ────────────────────────────────────
export type ReviewMode = 'due' | 'random';

type PickInput = {
  mode: ReviewMode;
  rows: SavedSentence[];
  dueAt: ReadonlyMap<string, number>; // 복습 달력에서 때가 된 문장 id → 복습 시각
  limit?: number;
  rng?: () => number;
};

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 글자가 아직 없는 문장은 말할 정답이 없어서 뺀다
export function pickReviewRows({ mode, rows, dueAt, limit = REVIEW_BATCH, rng = Math.random }: PickInput): SavedSentence[] {
  const usable = rows.filter((r) => r.en && r.ko);
  if (mode === 'random') return shuffle(usable, rng).slice(0, limit);
  return usable
    .filter((r) => dueAt.has(r.id))
    .sort((a, b) => (dueAt.get(a.id) ?? 0) - (dueAt.get(b.id) ?? 0))
    .slice(0, limit);
}

// ── 카드 진행 상태 ───────────────────────────────────────
export type CardOutcome = 'open' | 'passed' | 'gave-up';
export type GradedCard = { id: string; grade: Grade };

export type ReviewState = {
  ids: string[];
  index: number; // ids.length와 같으면 전부 끝난 것
  hint: HintLevel;
  maxHint: HintLevel; // 힌트를 몇 단계까지 줄지 (문장 복습 3, 단어 퀴즈 2)
  fails: number;
  outcome: CardOutcome;
  graded: GradedCard[]; // 끝낸 카드의 등급 (화면이 이 길이가 늘 때마다 복습 달력에 기록한다)
};

export type ReviewAction =
  | { type: 'attempt'; id: string; status: 'passed' | 'failed' }
  | { type: 'hint' }
  | { type: 'giveUp' }
  | { type: 'next' };

export function initReview(ids: string[], maxHint: HintLevel = 2): ReviewState {
  return { ids, index: 0, hint: 0, maxHint, fails: 0, outcome: 'open', graded: [] };
}

export const isFinished = (s: ReviewState) => s.index >= s.ids.length;

function finish(s: ReviewState, passed: boolean): ReviewState {
  const grade = gradeFor(passed, s.hint, s.fails);
  return { ...s, outcome: passed ? 'passed' : 'gave-up', graded: [...s.graded, { id: s.ids[s.index], grade }] };
}

export function reviewReducer(s: ReviewState, a: ReviewAction): ReviewState {
  if (isFinished(s)) return s;
  switch (a.type) {
    case 'attempt': {
      // 늦게 도착한 앞 카드의 판정이나 이미 끝난 카드의 판정은 버린다
      if (a.id !== s.ids[s.index] || s.outcome !== 'open') return s;
      if (a.status === 'passed') return finish(s, true);
      const fails = s.fails + 1;
      return fails >= MAX_FAILS ? finish({ ...s, fails }, false) : { ...s, fails };
    }
    case 'hint':
      return s.outcome === 'open' && s.hint < s.maxHint ? { ...s, hint: (s.hint + 1) as HintLevel } : s;
    case 'giveUp':
      return s.outcome === 'open' ? finish(s, false) : s;
    case 'next':
      return s.outcome === 'open' ? s : { ...s, index: s.index + 1, hint: 0, fails: 0, outcome: 'open' };
  }
}

export function gradeCounts(graded: GradedCard[]): Record<Grade, number> {
  const c: Record<Grade, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const g of graded) c[g.grade] += 1;
  return c;
}
