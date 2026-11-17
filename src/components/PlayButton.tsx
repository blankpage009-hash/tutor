import { IconPause, IconPlay } from './icons/icons';
import styles from './MicButton.module.css';

type Props = { playing: boolean; listening: boolean; disabled?: boolean; status: string; onClick: () => void };

// 드릴 재생 버튼: 누르면 이어 말하기 시작(▶), 다시 누르면 일시정지(⏸). 모양은 MicButton과 같게 맞춘다
export function PlayButton({ playing, listening, disabled, status, onClick }: Props) {
  return (
    <div className={styles.wrap}>
      <button type="button" onClick={onClick} disabled={disabled}
        className={`${styles.mic} ${listening ? styles.listening : ''}`}
        aria-label={playing ? '일시정지' : '재생'} aria-pressed={playing}>
        {playing ? <IconPause /> : <IconPlay />}
      </button>
      <p className={styles.status} lang="ko" aria-live="polite">{status}</p>
    </div>
  );
}
