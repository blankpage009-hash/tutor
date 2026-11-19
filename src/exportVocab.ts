// 단어장 내보내기 문자열 만들기 (순수 함수). 저장·공유는 화면 쪽이 한다. 보관함 `exportSaved.ts`와 같은 방식.
import type { VocabWord } from './db/types';
import { posLabel } from './posLabels';

export type VocabItem = Pick<VocabWord, 'word' | 'meaning' | 'pos' | 'sourceEn' | 'sourceKo' | 'savedAt'>;

// 엑셀·아이폰 파일 앱이 한글을 깨뜨리지 않게 CSV 앞에 BOM(글자 인코딩 표시)을 붙인다
const BOM = '﻿';

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(items: VocabItem[]): string {
  const rows = [['word', 'meaning', 'part_of_speech', 'sentence', 'sentence_ko', 'saved_at'], ...items.map((w) => [
    w.word, w.meaning, posLabel(w.pos), w.sourceEn ?? '', w.sourceKo ?? '', new Date(w.savedAt).toISOString()
  ])];
  return BOM + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// 칸 안의 탭·줄바꿈은 Anki 가져오기를 깨뜨리므로 공백으로 바꾼다
function tsvCell(v: string): string {
  return v.replace(/[\t\r\n]+/g, ' ').trim();
}

// Anki: 앞면 = 영어 단어, 뒷면 = 뜻(품사), 세 번째 칸 = 출처 문장. 카드 뒤집기 퀴즈와 같은 방향
export function toAnkiTsv(items: VocabItem[]): string {
  return items
    .map((w) => `${tsvCell(w.word)}\t${tsvCell(`${w.meaning} (${posLabel(w.pos)})`)}\t${tsvCell(w.sourceEn ?? '')}`)
    .join('\n') + '\n';
}

export function toJson(items: VocabItem[], now = Date.now()): string {
  return JSON.stringify({ app: 'english-tutor', kind: 'vocab', exportedAt: now, items }, null, 2);
}
