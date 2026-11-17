// 드릴 60회 순서를 계산하는 순수 모듈 (PLAN Phase 5.5, 사용자 결정: 바퀴 방식).
// 6문장을 한 바퀴씩 돈다: 1회차 문장1~6 → 2회차 문장1~6 … 10회차. 회차의 단계는 레슨 JSON drillStages를 따른다.
import type { Drill, DrillStage, NewLesson } from './content/lessonTypes';
import type { Sentence } from './content/types';

export type DrillStep = {
  // 회차마다 다른 id. 같으면 말하기 엔진이 2회차부터 "이미 통과한 문장"으로 보고 그냥 넘긴다
  stepId: string;
  // 보관함 저장용 id(문장 단위). 나중 보관함·SRS가 이 형식(INT1-U01-L01-d1)을 쓴다
  saveId: string;
  drill: Drill;
  rep: number; // 1~10
  stage: DrillStage;
};

export const DRILL_MODE_LABEL: Record<DrillStage['mode'], string> = {
  repeat: '따라 말하기',
  read: '보고 말하기',
  recall: '기억해서 말하기',
  respond: '상황 응답'
};

export function drillSaveId(lessonId: string, drillId: number): string {
  return `${lessonId}-d${drillId}`;
}

function stageOf(stages: DrillStage[], rep: number): DrillStage {
  const s = stages.find((st) => st.reps.includes(rep));
  if (!s) throw new Error(`드릴 ${rep}회차의 단계가 없어요`);
  return s;
}

export function buildDrillPlan(lesson: Pick<NewLesson, 'lessonId' | 'drills' | 'drillStages'>): DrillStep[] {
  const reps = lesson.drillStages.flatMap((s) => s.reps).sort((a, b) => a - b);
  return reps.flatMap((rep) => {
    const stage = stageOf(lesson.drillStages, rep);
    return lesson.drills.map((drill) => {
      const saveId = drillSaveId(lesson.lessonId, drill.id);
      return { stepId: `${saveId}-r${rep}`, saveId, drill, rep, stage };
    });
  });
}

// 기존 말하기 엔진(useShadowingAttempt·이어 말하기)이 먹는 모양으로 바꾼다
export function toSentence(step: DrillStep): Sentence {
  return {
    id: step.stepId, en: step.drill.en, ko: step.drill.ko, note: step.drill.point,
    hintWords: [], vocab: [], variations: [], audio: step.drill.audio.normal
  };
}

// 문장마다 몇 회차를 끝냈는지 (목록 표시용)
export function doneRepsByDrill(plan: DrillStep[], cleared: Set<string>): Map<number, number> {
  const m = new Map<number, number>();
  for (const s of plan) {
    if (cleared.has(s.stepId)) m.set(s.drill.id, (m.get(s.drill.id) ?? 0) + 1);
  }
  return m;
}

// 먼저 들려줄 소리: 따라 말하기는 정답 음성, 상황 응답은 영어 cue 음성, 나머지는 없음
export function promptAudio(step: DrillStep): string | null {
  if (step.stage.mode === 'respond') return step.drill.cue.audio ?? null;
  return step.stage.playAudio ? step.drill.audio.normal : null;
}
