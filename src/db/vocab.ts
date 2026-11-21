import { srsId } from '../srs';
import { db } from './db';
import type { VocabWord } from './types';

export type NewWord = Pick<VocabWord, 'word' | 'meaning' | 'pos' | 'sourceSentenceId' | 'sourceEn' | 'sourceKo'>;

// 단어장은 같은 단어(소문자)를 한 번만 담는다: 문장마다 다시 눌러도 단어 카드가 늘어나지 않게
export function findWord(word: string): Promise<VocabWord | undefined> {
  return db.vocab.where('word').equals(word).first();
}

// 단어는 날짜 복습 달력 없이 Known/Unknown만 가진다 (2026-11-21 사용자 결정). 새 단어는 Unknown으로 시작.
// 이미 있는 단어면 그대로 돌려준다
export async function saveWord(input: NewWord): Promise<VocabWord | null> {
  const id = await db.transaction('rw', db.vocab, async () => {
    const existing = await findWord(input.word);
    if (existing?.id !== undefined) return existing.id;
    return (await db.vocab.add({ ...input, known: false, savedAt: Date.now() })) as number;
  });
  // 다시 읽어 확인한다. iOS 홈화면 앱에서 저장이 조용히 실패해도 "저장됨"으로 보이지 않게
  return (await db.vocab.get(id)) ?? null;
}

export function updateWord(id: number, fields: Pick<VocabWord, 'meaning' | 'pos'>): Promise<number> {
  return db.vocab.update(id, fields);
}

export function setWordKnown(id: number, known: boolean): Promise<number> {
  return db.vocab.update(id, { known });
}

export async function removeWord(id: number): Promise<void> {
  await db.transaction('rw', db.vocab, db.srsState, async () => {
    await db.vocab.delete(id);
    await db.srsState.delete(srsId('word', String(id)));
  });
}

// 아직 못 맞힌(Known이 아닌) 단어 수. known은 색인이 없어서 전부 읽어 센다 (단어는 많아야 수백 개)
export async function countUnknownWords(): Promise<number> {
  return db.vocab.filter((w) => !w.known).count();
}

// 단어 목록: 최근에 저장한 단어가 위 (방금 저장한 것을 바로 찾도록)
export function listWords(): Promise<VocabWord[]> {
  return db.vocab.orderBy('savedAt').reverse().toArray();
}
