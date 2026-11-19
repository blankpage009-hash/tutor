import { dayKey } from '../activity';
import { db } from './db';
import type { Activity } from './types';

// 오늘 활동 횟수를 하나 올린다. 읽고-고쳐-쓰기를 한 번에 묶어, 이어 말하기처럼 통과가 연달아 와도 서로 덮어쓰지 않게
export async function bumpActivity(kind: 'practice' | 'review', now = Date.now()): Promise<void> {
  const date = dayKey(now);
  await db.transaction('rw', db.activity, async () => {
    const cur = (await db.activity.get(date)) ?? { date, practice: 0, review: 0 };
    await db.activity.put({ ...cur, [kind]: cur[kind] + 1 });
  });
}

// 학습 화면에서 부르는 버전: 기록이 실패해도 학습은 계속되어야 하므로 오류를 삼킨다
export function logActivity(kind: 'practice' | 'review'): void {
  bumpActivity(kind).catch(() => undefined);
}

export function listActivity(): Promise<Activity[]> {
  return db.activity.toArray();
}
