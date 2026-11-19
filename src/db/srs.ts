import { newSrsState, reviewSrs, srsId, type Grade } from '../srs';
import { db } from './db';
import type { SrsState } from './types';

// 문장을 저장하면 복습 달력에도 올린다 (저장한 다음 날부터 복습 대상)
export async function ensureSentenceSrs(itemId: string, dueInDays = 1): Promise<void> {
  const id = srsId('sentence', itemId);
  if (!(await db.srsState.get(id))) await db.srsState.put(newSrsState('sentence', itemId, Date.now(), dueInDays));
}

export function removeSrs(kind: SrsState['kind'], itemId: string): Promise<void> {
  return db.srsState.delete(srsId(kind, itemId));
}

export function listSrs(kind: SrsState['kind']): Promise<SrsState[]> {
  return db.srsState.where('kind').equals(kind).toArray();
}

export function putSrs(state: SrsState): Promise<unknown> {
  return db.srsState.put(state);
}

// 오늘(지금) 때가 된 문장: id → 복습 시각. dueAt 색인으로 찾고 종류는 걸러 낸다
export async function dueSentenceTimes(now: number): Promise<Map<string, number>> {
  const rows = await db.srsState.where('dueAt').belowOrEqual(now).filter((s) => s.kind === 'sentence').toArray();
  return new Map(rows.map((s) => [s.itemId, s.dueAt]));
}

export async function countDueSentences(now: number): Promise<number> {
  return (await dueSentenceTimes(now)).size;
}

// 오늘 때가 된 단어 수. 단어를 지울 때 달력도 같이 지우므로 달력 개수 = 복습할 단어 수
export async function countDueWords(now: number): Promise<number> {
  return db.srsState.where('dueAt').belowOrEqual(now).filter((s) => s.kind === 'word').count();
}

// 오늘 때가 된 단어: 단어 번호(글자) → 복습 시각
export async function dueWordTimes(now: number): Promise<Map<string, number>> {
  const rows = await db.srsState.where('dueAt').belowOrEqual(now).filter((s) => s.kind === 'word').toArray();
  return new Map(rows.map((s) => [s.itemId, s.dueAt]));
}

// 단어 퀴즈 결과 한 건을 달력에 반영한다 (문장 복습과 같은 계산, 읽고-고쳐-쓰기를 한 번에 묶음)
export async function recordWordReview(itemId: string, grade: Grade, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.srsState, async () => {
    const id = srsId('word', itemId);
    const cur = (await db.srsState.get(id)) ?? newSrsState('word', itemId, now, 0);
    await db.srsState.put(reviewSrs(cur, grade, now));
  });
}

// 복습 결과 한 건을 달력에 반영한다. 읽고-고쳐-쓰기를 한 번에 묶어 두 번 눌려도 꼬이지 않게
export async function recordSentenceReview(itemId: string, grade: Grade, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.srsState, async () => {
    const id = srsId('sentence', itemId);
    const cur = (await db.srsState.get(id)) ?? newSrsState('sentence', itemId, now, 0);
    await db.srsState.put(reviewSrs(cur, grade, now));
  });
}
