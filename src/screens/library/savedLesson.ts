import type { Lesson } from '../../content/types';
import type { SavedSentence } from '../../db/types';

// 보관함 문장들을 "수업 한 개" 모양으로 묶어 기존 쉐도잉 화면에 태운다 (말하기 엔진을 새로 만들지 않으려고)
// startId 문장부터 시작해 목록 순서대로 이어지고, 끝까지 가면 앞쪽 문장으로 돌아온다
export function toSavedLesson(rows: SavedSentence[], startId: string): Lesson | null {
  const usable = rows.filter((r) => r.en && r.ko);
  if (usable.length === 0) return null;
  const at = Math.max(0, usable.findIndex((r) => r.id === startId));
  const ordered = [...usable.slice(at), ...usable.slice(0, at)];
  return {
    id: '보관함', // 쉐도잉 화면 목록 머리에 그대로 보이고, 문장 묶음이 바뀌었는지 가르는 열쇠로도 쓰인다
    title: 'Saved sentences',
    titleKo: '보관함 연습',
    intro: '',
    sentences: ordered.map((r) => ({
      id: r.id, en: r.en ?? '', ko: r.ko ?? '', note: '', hintWords: [], vocab: [], variations: [],
      audio: r.audio || undefined
    })),
    roleplay: { id: 'saved-practice', situation: '', tutorRole: '', myRole: '', turns: [] }
  };
}
