import { laterStage, type Stage } from '../lessonFlow';
import { laterNewStage, type NewLessonStage } from '../newLessonFlow';
import { db } from './db';
import type { LessonProgress } from './types';

async function save(lessonId: string, courseId: string, next: Stage, cur: LessonProgress | undefined): Promise<void> {
  const now = Date.now();
  await db.progress.put({
    lessonId,
    courseId,
    stage: next,
    updatedAt: now,
    completedAt: next === 'done' ? (cur?.completedAt ?? now) : cur?.completedAt
  });
}

// 단계에 들어갈 때마다 불러 진도를 올린다. 이미 더 멀리 간 수업은 뒤로 돌아가지 않는다
export async function markStage(lessonId: string, courseId: string, stage: Stage): Promise<void> {
  const cur = await db.progress.get(lessonId);
  await save(lessonId, courseId, laterStage(cur?.stage, stage), cur);
}

// 새 커리큘럼 레슨용. 단계 순서가 달라서(설명→대화문→드릴→롤플레이) 따로 비교한다
export async function markNewStage(lessonId: string, levelKey: string, stage: NewLessonStage): Promise<void> {
  const cur = await db.progress.get(lessonId);
  await save(lessonId, levelKey, laterNewStage(cur?.stage, stage), cur);
}

export function listProgress(): Promise<LessonProgress[]> {
  return db.progress.toArray();
}
