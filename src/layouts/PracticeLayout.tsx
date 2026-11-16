import { Link, Outlet } from 'react-router-dom';
import { IconClose } from '../components/icons/icons';
import styles from './Layout.module.css';

// 연습 화면: 탭바 없이 왼쪽 위 닫기(X)만 둬서 연습에 집중하게 한다
export function PracticeLayout() {
  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <Link to="/" className={styles.close} aria-label="닫기">
          <IconClose />
        </Link>
        <Outlet />
      </main>
    </div>
  );
}
