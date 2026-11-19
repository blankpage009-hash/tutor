import type { ReactNode } from 'react';
import styles from './ScreenHeader.module.css';

// action: 제목 줄 오른쪽 끝에 놓을 아이콘 버튼 (홈의 설정 아이콘 등)
type Props = { eyebrow?: string; title: string; action?: ReactNode };

export function ScreenHeader({ eyebrow, title, action }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {action}
    </header>
  );
}
