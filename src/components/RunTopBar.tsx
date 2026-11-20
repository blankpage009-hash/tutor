import { Link } from 'react-router-dom';
import { IconClose } from './icons/icons';
import styles from './RunTopBar.module.css';

type Props = {
  closeTo: string; // X를 누르면 갈 곳 (복습 = 홈, 단어 퀴즈 = 단어장)
  closeLabel: string;
  value?: number; // 0~1. 주지 않으면 막대 없이 X만 (불러오는 중·빈 화면)
  count?: string; // 막대 오른쪽 "3/8"
};

// 디자인 v2 08·11 맨 위: X + 4px 진행 막대 + "3/8". 탭 막대 없는 한 판 연습 화면용
export function RunTopBar({ closeTo, closeLabel, value, count }: Props) {
  const pct = value === undefined ? null : Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={styles.bar}>
      <Link to={closeTo} className={styles.close} aria-label={closeLabel}><IconClose /></Link>
      {pct !== null && (
        <div className={styles.track} role="progressbar" aria-label="진행" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
      )}
      <span className={styles.count}>{count}</span>
    </div>
  );
}
