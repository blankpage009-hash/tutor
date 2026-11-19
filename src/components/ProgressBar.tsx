import styles from './ProgressBar.module.css';

// value 0~1. segments를 주면 디자인 v2의 "칸 나뉜 막대"(예: 목표 10칸 중 6칸)로 그린다.
type Props = { value: number; label: string; segments?: number };

// 칸이 너무 많으면 칸 사이 틈만 보여 막대가 지저분해져서 이 수까지만 칸으로 나눈다.
const MAX_SEGMENTS = 20;

export function ProgressBar({ value, label, segments }: Props) {
  const ratio = Math.min(1, Math.max(0, value));
  const pct = Math.round(ratio * 100);
  const aria = { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct } as const;
  if (segments && segments > 1 && segments <= MAX_SEGMENTS) {
    const filled = Math.round(ratio * segments);
    return (
      <div className={styles.segments} style={{ gridTemplateColumns: `repeat(${segments}, 1fr)` }} {...aria}>
        {Array.from({ length: segments }, (_, i) => (
          <div key={i} className={i < filled ? styles.segOn : styles.seg} />
        ))}
      </div>
    );
  }
  return (
    <div className={styles.track} {...aria}>
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
