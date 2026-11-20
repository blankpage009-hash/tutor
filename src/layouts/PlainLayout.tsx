import { Outlet } from 'react-router-dom';
import styles from './Layout.module.css';

// 닫기(X)를 화면이 직접 그리는 전체 화면용. PracticeLayout의 X는 항상 홈으로 가는데,
// 레슨 화면의 X는 그 레슨이 있던 코스 목록으로 돌아가야 해서 따로 둔다
export function PlainLayout() {
  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
