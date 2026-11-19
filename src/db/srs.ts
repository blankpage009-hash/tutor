import { newSrsState, srsId } from '../srs';
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
