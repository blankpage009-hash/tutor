import styles from './SegmentedControl.module.css';

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

export function SegmentedControl<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
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
