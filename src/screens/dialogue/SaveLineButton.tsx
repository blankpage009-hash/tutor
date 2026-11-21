import { IconBookmark } from '../../components/icons/icons';
import styles from './Dialogue.module.css';

// 대화문 줄의 북마크 (드릴 카드와 같은 모양). 눌러서 저장, 다시 누르면 해제
export function SaveLineButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={styles.save} onClick={onToggle} aria-pressed={saved}
      aria-label={saved ? '저장 해제' : '문장 저장'}>
      <IconBookmark filled={saved} />
    </button>
  );
}
