import styles from './Switch.module.css';

type Props = { label: string; on: boolean; onChange: (on: boolean) => void };

// 켜기/끄기 스위치. 화면 읽기 프로그램이 "스위치, 켜짐"으로 읽도록 role="switch"를 쓴다
export function Switch({ label, on, onChange }: Props) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      className={`${styles.track} ${on ? styles.on : ''}`} onClick={() => onChange(!on)}>
      <span className={styles.thumb} />
    </button>
  );
}
