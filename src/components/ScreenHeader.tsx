import styles from './ScreenHeader.module.css';

type Props = { eyebrow?: string; title: string };

export function ScreenHeader({ eyebrow, title }: Props) {
  return (
    <header className={styles.header}>
      {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
      <h1 className={styles.title}>{title}</h1>
    </header>
  );
}
