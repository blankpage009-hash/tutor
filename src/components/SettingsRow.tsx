import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronRight } from './icons/icons';
import styles from './SettingsRow.module.css';

type Props = {
  name: string;
  hint?: string;
  to?: string;
  children?: ReactNode;
};

export function SettingsRow({ name, hint, to, children }: Props) {
  const text = (
    <span className={styles.text}>
      <span className={styles.name}>{name}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </span>
  );
  if (to) {
    return (
      <Link to={to} className={styles.row}>
        {text}
        <IconChevronRight />
      </Link>
    );
  }
  return (
    <div className={styles.row}>
      {text}
      {children}
    </div>
  );
}
