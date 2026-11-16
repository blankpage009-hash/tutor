import type { ReactNode } from 'react';
import styles from './TwoColumn.module.css';

type Props = { list: ReactNode; children: ReactNode };

// iPad(768px 이상)에서는 왼쪽 목록 + 오른쪽 상세, iPhone에서는 위아래로 한 칸
export function TwoColumn({ list, children }: Props) {
  return (
    <div className={styles.grid}>
      <section className={styles.list}>{list}</section>
      <section className={styles.detail}>{children}</section>
    </div>
  );
}
