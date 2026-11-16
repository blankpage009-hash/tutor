import { NavLink } from 'react-router-dom';
import { TABS } from '../routes';
import { TAB_ICONS } from './icons/icons';
import styles from './TabBar.module.css';

export function TabBar() {
  return (
    <nav className={styles.bar} aria-label="주 메뉴">
      {TABS.map((tab) => {
        const Icon = TAB_ICONS[tab.icon];
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          >
            <Icon />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
