import { Outlet } from 'react-router-dom';
import { TabBar } from '../components/TabBar';
import styles from './Layout.module.css';

// 탭 화면: 아래 탭바가 있고, 내용만 스크롤된다
export function TabLayout() {
  return (
    <div className={`${styles.shell} ${styles.withTabs}`}>
      <main className={styles.content}>
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
