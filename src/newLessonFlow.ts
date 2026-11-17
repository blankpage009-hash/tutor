// 새 커리큘럼 레슨 한 개의 흐름(STEP 1 설명 → 2 대화문 → 3 드릴 → 4 롤플레이 → 완료)을 계산하는 순수 모듈.
// 기존 수업 흐름(lessonFlow.ts)과 단계 이름이 달라서 따로 둔다. 진도 저장 칸(LessonProgress)은 같이 쓴다.
import type { LessonProgress, NewLessonStage } from './db/types';

export type { NewLessonStage };

export const NEW_STAGES: NewLessonStage[] = ['learn', 'dialogue', 'drill', 'roleplay', 'done'];

export const NEW_STAGE_LABEL: Record<NewLessonStage, string> = {
  learn: '설명',
  dialogue: '대화문',
  drill: '드릴',
  roleplay: '롤플레이',
  done: '완료'
};

export function isNewStage(s: string | undefined): s is NewLessonStage {
  return NEW_STAGES.includes(s as NewLessonStage);
}

// 진도는 "가장 멀리 간 단계"만 남긴다. 기존 수업의 단계 이름이 섞여 들어와도 없던 것으로 친다
export function laterNewStage(a: LessonProgress['stage'] | undefined, b: NewLessonStage): NewLessonStage {
  if (!isNewStage(a)) return b;
  return NEW_STAGES.indexOf(a) >= NEW_STAGES.indexOf(b) ? a : b;
}

export function nextNewStage(stage: NewLessonStage): NewLessonStage {
  return NEW_STAGES[Math.min(NEW_STAGES.indexOf(stage) + 1, NEW_STAGES.length - 1)];
}

// 끝낸 레슨은 처음(설명)부터 다시 들어간다
export function newStagePath(lessonId: string, stage: NewLessonStage): string {
  return `/n/${lessonId}/${stage === 'done' ? 'learn' : stage}`;
}
