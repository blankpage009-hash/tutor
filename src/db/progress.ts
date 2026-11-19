import { laterStage, type Stage } from '../lessonFlow';
import { addFinishedStep, enteredNewStage, missingSteps, type NewLessonStep } from '../newLessonFlow';
import { logActivity } from './activity';
import { db } from './db';
import type { DrillPosition, LessonProgress } from './types';

type Change = (cur: LessonProgress | undefined) => Partial<LessonProgress> & Pick<LessonProgress, 'stage'>;

// 한 줄을 읽고 고쳐서 쓰는 일을 한 번에 묶는다. 들어올 때 기록·드릴 위치·단계 끝냄이 겹쳐도
// 서로의 칸(steps·drill)을 지우지 않게 하기 위해서다
async function update(lessonId: string, courseId: string, change: Change): Promise<LessonProgress> {
  return db.transaction('rw', db.progress, async () => {
    const cur = await db.progress.get(lessonId);
    const now = Date.now();
    const next: LessonProgress = { ...cur, lessonId, courseId, updatedAt: now, ...change(cur) };
    next.completedAt = next.stage === 'done' ? (cur?.completedAt ?? now) : cur?.completedAt;
    await db.progress.put(next);
    return next;
  });
}

// 단계에 들어갈 때마다 불러 진도를 올린다. 이미 더 멀리 간 수업은 뒤로 돌아가지 않는다
export async function markStage(lessonId: string, courseId: string, stage: Stage): Promise<void> {
  await update(lessonId, courseId, (cur) => ({ stage: laterStage(cur?.stage, stage) }));
}

// 새 커리큘럼 레슨: 들어갈 때. 마지막으로 들어간 단계를 남긴다 (newLessonFlow.enteredNewStage)
export async function markNewStage(lessonId: string, levelKey: string, step: NewLessonStep): Promise<void> {
  await update(lessonId, levelKey, (cur) => ({ stage: enteredNewStage(cur?.stage, step) }));
}

// 새 레슨의 한 단계를 끝까지 갔을 때. 네 단계를 다 끝냈으면 레슨 '완료'. 남은 단계를 돌려준다
export async function finishNewStep(lessonId: string, levelKey: string, step: NewLessonStep) {
  const row = await update(lessonId, levelKey, (cur) => {
    const steps = addFinishedStep(cur?.steps, step);
    const stage = missingSteps(steps).length ? enteredNewStage(cur?.stage, step) : 'done';
    return { steps, stage };
  });
  // 롤플레이처럼 통과 횟수를 따로 세지 않는 단계만 한 날도 학습일이 되도록 단계 끝냄을 연습 1회로 센다
  logActivity('practice');
  return { done: row.stage === 'done', missing: missingSteps(row.steps) };
}

// 드릴을 하다 만 위치. undefined면 지운다 (드릴을 다 끝냈을 때 — 다음엔 1회차부터)
export async function saveDrillPosition(lessonId: string, levelKey: string, drill: DrillPosition | undefined) {
  await update(lessonId, levelKey, (cur) => ({ stage: cur?.stage ?? 'drill', drill }));
}

export function getProgress(lessonId: string): Promise<LessonProgress | undefined> {
  return db.progress.get(lessonId);
}

export function listProgress(): Promise<LessonProgress[]> {
  return db.progress.toArray();
}
