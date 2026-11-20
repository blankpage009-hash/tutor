import type { ExportFormat } from '../../components/ExportSheet';
import type { VocabWord } from '../../db/types';
import { toAnkiTsv, toCsv, toJson } from '../../exportVocab';

// 단어장 내보내기 형식 (오른쪽 위 아이콘 → ExportSheet, 보관함과 같은 방식)
export function vocabExportFormats(rows: VocabWord[]): ExportFormat[] {
  return [
    { key: 'json', label: 'JSON (전체 백업)', file: 'vocab.json', mime: 'application/json', make: () => toJson(rows) },
    { key: 'csv', label: 'CSV (엑셀용)', file: 'vocab.csv', mime: 'text/csv', make: () => toCsv(rows) },
    { key: 'anki', label: 'Anki용 TSV', file: 'vocab-anki.txt', mime: 'text/plain', make: () => toAnkiTsv(rows) }
  ];
}
