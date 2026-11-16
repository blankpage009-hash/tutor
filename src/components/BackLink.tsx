import { Link } from 'react-router-dom';
import { IconChevronLeft } from './icons/icons';
import styles from './BackLink.module.css';

type Props = { to: string; label: string };

export function BackLink({ to, label }: Props) {
  return (
    <Link to={to} className={styles.link}>
      <IconChevronLeft />
      <span>{label}</span>
    </Link>
  );
}
