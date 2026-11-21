import { useEffect } from 'react';
import sheet from '../../components/ExportSheet.module.css';
import { IconClose } from '../../components/icons/icons';
import styles from './RolePlay.module.css';

type Props = { sentences: string[]; onClose: () => void };

// 롤플레이 시작 전에 드릴 문장을 다시 훑어보는 팝업. 대답할 때 떠올리기 쉽도록 영어만 (해석은 뺀다).
// 아래에서 올라오는 모양은 내보내기 창(ExportSheet)과 같은 스타일을 함께 쓴다
export function ExampleSheet({ sentences, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={sheet.backdrop} onClick={onClose}>
      <div className={`${sheet.sheet} ${styles.exampleSheet}`} role="dialog" aria-modal="true" aria-label="Example sentences"
        onClick={(e) => e.stopPropagation()}>
        <div className={sheet.top}>
          <span className={sheet.label} lang="en">EXAMPLE SENTENCES</span>
          <button type="button" className={sheet.close} onClick={onClose} aria-label="닫기" autoFocus><IconClose /></button>
        </div>
        <ol className={styles.exampleList} lang="en">
          {sentences.map((en, i) => <li key={i} className={styles.exampleRow}>{en}</li>)}
        </ol>
      </div>
    </div>
  );
}
