import { laterStage, type Stage } from '../lessonFlow';
import { db } from './db';
import type { LessonProgress } from './types';

// 단계에 들어갈 때마다 불러 진도를 올린다. 이미 더 멀리 간 수업은 뒤로 돌아가지 않는다
export async function markStage(lessonId: string, courseId: string, stage: Stage): Promise<void> {
  const cur = await db.progress.get(lessonId);
  const next = laterStage(cur?.stage, stage);
  const now = Date.now();
  await db.progress.put({
    lessonId,
    courseId,
    stage: next,
    updatedAt: now,
    completedAt: next === 'done' ? (cur?.completedAt ?? now) : cur?.completedAt
  });
}

export function listProgress(): Promise<LessonProgress[]> {
  return db.progress.toArray();
}
