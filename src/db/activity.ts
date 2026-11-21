import { dayKey } from '../activity';
import { db } from './db';
import type { Activity } from './types';

// 오늘 활동 횟수를 하나 올린다. 읽고-고쳐-쓰기를 한 번에 묶어, 이어 말하기처럼 통과가 연달아 와도 서로 덮어쓰지 않게
export async function bumpActivity(kind: 'practice' | 'review', now = Date.now()): Promise<void> {
  const date = dayKey(now);
  await db.transaction('rw', db.activity, async () => {
    // 새 줄은 spoken·seconds를 0으로 시작해야, 뒤이은 말하기가 practice에서 이어 세며 두 번 세지 않는다
    const cur = (await db.activity.get(date)) ?? { date, practice: 0, review: 0, spoken: 0, seconds: 0 };
    await db.activity.put({ ...cur, [kind]: cur[kind] + 1 });
  });
}

// 학습 화면에서 부르는 버전: 기록이 실패해도 학습은 계속되어야 하므로 오류를 삼킨다
export function logActivity(kind: 'practice' | 'review'): void {
  bumpActivity(kind).catch(() => undefined);
}

// 오늘 줄을 읽고-고쳐-쓰기 한 번으로 (판정·시계가 겹쳐 와도 서로 덮어쓰지 않게)
async function updateToday(now: number, change: (cur: Activity) => Activity): Promise<void> {
  const date = dayKey(now);
  await db.transaction('rw', db.activity, async () => {
    const cur = (await db.activity.get(date)) ?? { date, practice: 0, review: 0, spoken: 0, seconds: 0 };
    await db.activity.put(change(cur));
  });
}

// 옛 백업을 복원한 줄에는 spoken이 없을 수 있어 practice에서 이어 센다
export function bumpSpoken(now = Date.now()): Promise<void> {
  return updateToday(now, (cur) => ({ ...cur, spoken: (cur.spoken ?? cur.practice) + 1 }));
}

export function logSpoken(): void {
  bumpSpoken().catch(() => undefined);
}

export function addStudySeconds(sec: number, now = Date.now()): Promise<void> {
  if (sec <= 0) return Promise.resolve();
  return updateToday(now, (cur) => ({ ...cur, seconds: (cur.seconds ?? 0) + sec }));
}

export function listActivity(): Promise<Activity[]> {
  return db.activity.toArray();
}
