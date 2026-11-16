import { IconMic, IconStop } from './icons/icons';
import styles from './MicButton.module.css';

type Props = { listening: boolean; disabled?: boolean; status: string; onClick: () => void };

// handoff.md MicButton: 아래에 상태 문구를 꼭 붙인다
export function MicButton({ listening, disabled, status, onClick }: Props) {
  return (
    <div className={styles.wrap}>
      <button type="button" onClick={onClick} disabled={disabled}
        className={`${styles.mic} ${listening ? styles.listening : ''}`}
        aria-label={listening ? '듣기 멈추기' : '말하기 시작'} aria-pressed={listening}>
        {listening ? <IconStop /> : <IconMic />}
      </button>
      <p className={styles.status} lang="ko" aria-live="polite">{status}</p>
    </div>
  );
}
