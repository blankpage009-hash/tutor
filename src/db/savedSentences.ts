import { db } from './db';
import type { SavedSentence } from './types';

// 저장은 문장만 한다 (사용자 결정 2026-11-16: 나중에 다시 연습하려는 것이라 목소리는 보관하지 않음)

// 이미 저장된 문장은 처음 저장한 시각을 그대로 둔다 (보관함을 저장한 순서로 보여 줄 것이므로)
export async function saveSentence(row: Omit<SavedSentence, 'savedAt'>): Promise<boolean> {
  const existing = await db.savedSentences.get(row.id);
  if (!existing) await db.savedSentences.put({ ...row, savedAt: Date.now() });
  // 다시 읽어 확인한다. iOS 홈화면 앱에서 저장이 조용히 실패해도 "저장됨"으로 보이지 않게
  return Boolean(await db.savedSentences.get(row.id));
}

export async function savedIdsAmong(ids: string[]): Promise<Set<string>> {
  const rows = await db.savedSentences.bulkGet(ids);
  return new Set(rows.flatMap((r) => (r ? [r.id] : [])));
}
