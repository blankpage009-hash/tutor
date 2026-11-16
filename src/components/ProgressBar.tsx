import styles from './ProgressBar.module.css';

type Props = { value: number; label: string }; // value 0~1

export function ProgressBar({ value, label }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={styles.track} role="progressbar" aria-label={label}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
