import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronRight } from './icons/icons';
import styles from './SettingsRow.module.css';

// 이름 + 오른쪽 한 가지. 오른쪽에는 조절 부품(children), 또는 현재 값(value)과 ">"가 온다.
// to = 눌러서 하위 화면으로, onClick = 눌러서 바로 동작(백업 등)
type Props = {
  name: string;
  to?: string;
  onClick?: () => void;
  value?: string;
  danger?: boolean;
  disabled?: boolean;
  children?: ReactNode;
};

export function SettingsRow({ name, to, onClick, value, danger, disabled, children }: Props) {
  const cls = `${styles.row} ${danger ? styles.danger : ''}`;
  const label = <span className={styles.name}>{name}</span>;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {label}
        <span className={styles.end}>
          {value && <span className={styles.value}>{value}</span>}
          <IconChevronRight />
        </span>
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={`${cls} ${styles.button}`} disabled={disabled} onClick={onClick}>
        {label}
        {value && <span className={styles.value}>{value}</span>}
      </button>
    );
  }
  return (
    <div className={cls}>
      {label}
      {children}
    </div>
  );
}
