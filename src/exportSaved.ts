// 보관함 내보내기 문자열 만들기 (순수 함수). 파일로 저장·공유하는 일은 화면 쪽이 한다.
import type { SavedSentence } from './db/types';

type Item = Pick<SavedSentence, 'id' | 'lessonId' | 'courseId' | 'savedAt' | 'en' | 'ko'>;

// 엑셀·아이폰 파일 앱이 한글을 깨뜨리지 않게 CSV 앞에 BOM(글자 인코딩 표시)을 붙인다
const BOM = '﻿';

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(items: Item[]): string {
  const rows = [['id', 'english', 'korean', 'lesson', 'saved_at'], ...items.map((s) => [
    s.id, s.en ?? '', s.ko ?? '', s.lessonId, new Date(s.savedAt).toISOString()
  ])];
  return BOM + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// Anki 가져오기: 한 줄 = 카드 한 장, 탭으로 칸을 나눈다. 앞면은 한국어, 뒷면은 영어 (사용자 결정: 한국어 → 영어 복습과 같은 방향).
// 칸 안의 탭·줄바꿈은 가져오기를 깨뜨리므로 공백으로 바꾼다
function tsvCell(v: string): string {
  return v.replace(/[\t\r\n]+/g, ' ').trim();
}

export function toAnkiTsv(items: Item[]): string {
  return items.map((s) => `${tsvCell(s.ko ?? '')}\t${tsvCell(s.en ?? '')}\t${tsvCell(s.id)}`).join('\n') + '\n';
}

// 전체 백업용 (글자가 아직 안 채워진 문장도 id 그대로 담긴다)
export function toJson(items: Item[], now = Date.now()): string {
  return JSON.stringify({ app: 'english-tutor', kind: 'saved-sentences', exportedAt: now, items }, null, 2);
}
