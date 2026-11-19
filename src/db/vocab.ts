import { newSrsState, srsId } from '../srs';
import { db } from './db';
import type { VocabWord } from './types';

export type NewWord = Pick<VocabWord, 'word' | 'meaning' | 'pos' | 'sourceSentenceId' | 'sourceEn' | 'sourceKo'>;

// 단어장은 같은 단어(소문자)를 한 번만 담는다: 문장마다 다시 눌러도 단어 카드가 늘어나지 않게
export function findWord(word: string): Promise<VocabWord | undefined> {
  return db.vocab.where('word').equals(word).first();
}

// 저장하면 복습 달력(단어)에도 올린다 — 저장한 다음 날부터 복습 대상. 단어 저장과 달력 기록은 한 묶음(transaction)
// 으로 해서, 중간에 끊겨도 "달력 없는 단어"가 생기지 않게 한다. 이미 있는 단어면 그대로 돌려준다
export async function saveWord(input: NewWord): Promise<VocabWord | null> {
  const id = await db.transaction('rw', db.vocab, db.srsState, async () => {
    const existing = await findWord(input.word);
    if (existing?.id !== undefined) return existing.id;
    const newId = (await db.vocab.add({ ...input, savedAt: Date.now() })) as number;
    await db.srsState.put(newSrsState('word', String(newId), Date.now(), 1));
    return newId;
  });
  // 다시 읽어 확인한다. iOS 홈화면 앱에서 저장이 조용히 실패해도 "저장됨"으로 보이지 않게
  return (await db.vocab.get(id)) ?? null;
}

export function updateWord(id: number, fields: Pick<VocabWord, 'meaning' | 'pos'>): Promise<number> {
  return db.vocab.update(id, fields);
}

export async function removeWord(id: number): Promise<void> {
  await db.transaction('rw', db.vocab, db.srsState, async () => {
    await db.vocab.delete(id);
    await db.srsState.delete(srsId('word', String(id)));
  });
}

// 단어 목록: 최근에 저장한 단어가 위 (방금 저장한 것을 바로 찾도록)
export function listWords(): Promise<VocabWord[]> {
  return db.vocab.orderBy('savedAt').reverse().toArray();
}
