import type { DrillStage } from '../../content/lessonTypes';
import type { Sentence } from '../../content/types';
import type { SavedSentence } from '../../db/types';
import type { DrillStep } from '../../drillPlan';
import { toSavedLesson } from './savedLesson';

type CardShow = NonNullable<DrillStep['show']>;

// 반복 횟수별 회차 모양: 보고 따라 하기 → 영어만 → 중요 단어 가림 → 모두 가림 (사용자 요청 2026-11-21)
const SHOW_BY_REPS: Record<number, CardShow[]> = {
  1: ['en+ko'],
  3: ['en+ko', 'masked', 'none'],
  5: ['en+ko', 'en', 'masked', 'none', 'none'],
  10: ['en+ko', 'en', 'en', 'en', 'masked', 'masked', 'masked', 'none', 'none', 'none']
};

// 표에 없는 횟수가 들어와도 깨지지 않게, 첫 회차만 보여 주고 나머지는 모두 가린다
export function showForRep(reps: number, rep: number): CardShow {
  return SHOW_BY_REPS[reps]?.[rep - 1] ?? (rep === 1 ? 'en+ko' : 'none');
}

export type SavedPlanOptions = { reps?: number; shuffle?: boolean; random?: () => number };

// 첫 문장(사용자가 누른 문장)은 그대로 두고 나머지만 섞는다
function shuffleRest<T>(list: T[], keepFirst: boolean, random: () => number): T[] {
  const head = keepFirst ? list.slice(0, 1) : [];
  const rest = list.slice(head.length);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [...head, ...rest];
}

// 보관함 연습을 코스 드릴 카드 화면에 태우려고, 저장한 문장을 "한 바퀴짜리 드릴 계획"으로 바꾼다.
// 말하기·카드 화면을 새로 만들지 않으려는 것이라 모두 따라 말하기(repeat)이고,
// 반복 횟수만큼 같은 문장을 연달아 둔다 (A A A → B B B, 사용자 요청 2026-11-21)
export function toSavedPlan(rows: SavedSentence[], startId: string, passThreshold: number, opts: SavedPlanOptions = {}): DrillStep[] | null {
  const lesson = toSavedLesson(rows, startId);
  if (!lesson) return null;
  const reps = Math.max(1, opts.reps ?? 1);
  const keepFirst = rows.some((r) => r.id === startId);
  const sentences = opts.shuffle ? shuffleRest(lesson.sentences, keepFirst, opts.random ?? Math.random) : lesson.sentences;
  // 모든 카드가 같은 단계 객체를 써야 위쪽 진행 바가 한 칸으로 합쳐진다 (drillPlan.stageSegments)
  const stage: DrillStage = {
    reps: Array.from({ length: reps }, (_, i) => i + 1),
    mode: 'repeat', show: 'en+ko', playAudio: true, passScore: Math.round(passThreshold * 100)
  };
  return sentences.flatMap((s, i) => Array.from({ length: reps }, (_, r) => toStep(s, i + 1, r + 1, stage, showForRep(reps, r + 1))));
}

function toStep(s: Sentence, no: number, rep: number, stage: DrillStage, show: CardShow): DrillStep {
  // 음성 경로가 없던 옛 저장 문장은 빈 문자열로 두고, 재생 쪽(promptAudio)이 "없음"으로 읽는다
  const audio = s.audio ?? '';
  return {
    // 회차마다 id가 달라야 말하기 엔진이 2회차를 "이미 통과"로 건너뛰지 않는다
    stepId: `saved-${s.id}-r${rep}`,
    saveId: s.id,
    drill: {
      id: no, en: s.en, ko: s.ko, point: '',
      cue: { lang: 'en', text: '' },
      audio: { normal: audio, slow: audio }
    },
    rep,
    stage,
    show
  };
}
