import styles from './SegmentedControl.module.css';

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  // 설정 줄 오른쪽에 들어가는 낮은 모양(시안 34px). 기본은 터치하기 편한 높이
  compact?: boolean;
};

export function SegmentedControl<T extends string>({ options, value, onChange, label, compact }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={`${styles.group} ${compact ? styles.compact : ''}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={`${styles.btn} ${o.value === value ? styles.on : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
