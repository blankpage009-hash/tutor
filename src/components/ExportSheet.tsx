import { useEffect, useState } from 'react';
import { copyText, saveTextFile } from '../screens/library/saveFile';
import { Button } from './Button';
import styles from './ExportSheet.module.css';
import { IconClose } from './icons/icons';

export type ExportFormat = { key: string; label: string; file: string; mime: string; make: () => string };

const MESSAGE = { shared: '내보냈어요.', downloaded: '파일로 내려받았어요.', cancelled: '' } as const;

type Props = { title: string; formats: ExportFormat[]; onClose: () => void };

// 오른쪽 위 내보내기 아이콘을 누르면 아래에서 올라오는 형식 고르기 (디자인 v2 09·10, 사용자 결정 3).
// 저장 = 공유 시트 먼저·안 되면 내려받기(saveTextFile), 복사도 그대로
export function ExportSheet({ title, formats, onClose }: Props) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const save = async (f: ExportFormat) => {
    setMessage('');
    try {
      setMessage(MESSAGE[await saveTextFile(f.file, f.make(), f.mime)]);
    } catch (e) {
      setMessage(`내보내지 못했어요: ${String(e)}`);
    }
  };
  const copy = async (f: ExportFormat) => setMessage((await copyText(f.make())) ? '복사했어요.' : '복사하지 못했어요. 저장 버튼을 써 주세요.');
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <span className={styles.label} lang="en">EXPORT</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기" autoFocus><IconClose /></button>
        </div>
        <h2 className={styles.title} lang="ko">{title}</h2>
        <ul className={styles.list}>
          {formats.map((f) => (
            <li key={f.key} className={styles.row}>
              <span lang="ko">{f.label}</span>
              <span className={styles.buttons}>
                <Button size="sm" onClick={() => save(f)}>Save</Button>
                <Button size="sm" onClick={() => copy(f)}>Copy</Button>
              </span>
            </li>
          ))}
        </ul>
        {message && <p className={styles.message} lang="ko" role="status">{message}</p>}
      </div>
    </div>
  );
}
