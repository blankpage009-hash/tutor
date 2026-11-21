import { missOf } from '../missScore';
import { db } from './db';
import { ensureSentenceSrs, removeSrs } from './srs';
import type { SavedSentence } from './types';

// 저장은 문장만 한다 (사용자 결정 2026-11-16: 나중에 다시 연습하려는 것이라 목소리는 보관하지 않음)

// 이미 저장된 문장은 처음 저장한 시각을 그대로 둔다 (보관함을 저장한 순서로 보여 줄 것이므로).
// 예전에 글자 없이 저장된 문장을 다시 저장하면 글자만 채워 넣는다
export async function saveSentence(row: Omit<SavedSentence, 'savedAt'>): Promise<boolean> {
  const existing = await db.savedSentences.get(row.id);
  if (!existing) {
    await db.savedSentences.put({ ...row, savedAt: Date.now() });
    await ensureSentenceSrs(row.id);
  } else if (!existing.en && row.en) {
    await db.savedSentences.update(row.id, { en: row.en, ko: row.ko, audio: row.audio });
  }
  // 다시 읽어 확인한다. iOS 홈화면 앱에서 저장이 조용히 실패해도 "저장됨"으로 보이지 않게
  return Boolean(await db.savedSentences.get(row.id));
}

export async function savedIdsAmong(ids: string[]): Promise<Set<string>> {
  const rows = await db.savedSentences.bulkGet(ids);
  return new Set(rows.flatMap((r) => (r ? [r.id] : [])));
}

// 보관함 목록: 저장한 순서대로 (오래된 것이 위)
export function listSaved(): Promise<SavedSentence[]> {
  return db.savedSentences.orderBy('savedAt').toArray();
}

// 복습 달력이 생기기 전에 저장한 문장은 오늘부터 복습 대상으로 올린다 (이미 있는 것은 그대로)
export async function ensureSrsForAllSaved(): Promise<SavedSentence[]> {
  const list = await listSaved();
  await Promise.all(list.map((r) => ensureSentenceSrs(r.id, 0)));
  return list;
}

export async function removeSaved(id: string): Promise<void> {
  await db.savedSentences.delete(id);
  await removeSrs('sentence', id);
}

export function bumpMiss(id: string): Promise<number> {
  return db.savedSentences.where('id').equals(id).modify((r) => { r.miss = missOf(r) + 1; });
}

// 익숙해진 문장이 영원히 "어려운 문장"으로 남지 않게, 한 판을 깨끗이 통과하면 반으로 줄인다
export function halveMiss(id: string): Promise<number> {
  return db.savedSentences.where('id').equals(id).modify((r) => { r.miss = Math.floor(missOf(r) / 2); });
}

export function fillSavedText(id: string, text: Pick<SavedSentence, 'en' | 'ko' | 'audio'>): Promise<number> {
  return db.savedSentences.update(id, text);
}
