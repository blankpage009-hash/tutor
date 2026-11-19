import { useState } from 'react';
import { Button } from '../../components/Button';
import type { SavedSentence } from '../../db/types';
import { toAnkiTsv, toCsv, toJson } from '../../exportSaved';
import styles from './Library.module.css';
import { copyText, saveTextFile } from './saveFile';

type Format = { key: string; label: string; file: string; mime: string; make: (rows: SavedSentence[]) => string };

const FORMATS: Format[] = [
  { key: 'json', label: 'JSON (전체 백업)', file: 'saved-sentences.json', mime: 'application/json', make: (r) => toJson(r) },
  { key: 'csv', label: 'CSV (엑셀용)', file: 'saved-sentences.csv', mime: 'text/csv', make: toCsv },
  { key: 'anki', label: 'Anki용 TSV', file: 'saved-sentences-anki.txt', mime: 'text/plain', make: toAnkiTsv }
];

const MESSAGE = { shared: '내보냈어요.', downloaded: '파일로 내려받았어요.', cancelled: '' } as const;

export function ExportBar({ rows }: { rows: SavedSentence[] }) {
  const [message, setMessage] = useState('');
  const save = async (f: Format) => {
    setMessage('');
    try {
      setMessage(MESSAGE[await saveTextFile(f.file, f.make(rows), f.mime)]);
    } catch (e) {
      setMessage(`내보내지 못했어요: ${String(e)}`);
    }
  };
  const copy = async (f: Format) => setMessage((await copyText(f.make(rows))) ? '복사했어요.' : '복사하지 못했어요. 저장 버튼을 써 주세요.');
  return (
    <>
      <h2 className={styles.section} lang="ko">내보내기</h2>
      {FORMATS.map((f) => (
        <div key={f.key} className={styles.exportRow}>
          <span lang="ko">{f.label}</span>
          <span className={styles.actions}>
            <Button size="sm" onClick={() => save(f)}>저장</Button>
            <Button size="sm" variant="ghost" onClick={() => copy(f)}>복사</Button>
          </span>
        </div>
      ))}
      {message && <p className={styles.note} lang="ko" role="status">{message}</p>}
    </>
  );
}
