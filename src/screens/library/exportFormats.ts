import type { ExportFormat } from '../../components/ExportSheet';
import type { SavedSentence } from '../../db/types';
import { toAnkiTsv, toCsv, toJson } from '../../exportSaved';

// 보관함 내보내기 형식 (오른쪽 위 아이콘 → ExportSheet)
export function savedExportFormats(rows: SavedSentence[]): ExportFormat[] {
  return [
    { key: 'json', label: 'JSON (전체 백업)', file: 'saved-sentences.json', mime: 'application/json', make: () => toJson(rows) },
    { key: 'csv', label: 'CSV (엑셀용)', file: 'saved-sentences.csv', mime: 'text/csv', make: () => toCsv(rows) },
    { key: 'anki', label: 'Anki용 TSV', file: 'saved-sentences-anki.txt', mime: 'text/plain', make: () => toAnkiTsv(rows) }
  ];
}
