import { Link } from 'react-router-dom';
import { IconFlame } from '../../components/icons/icons';
import { ProgressBar } from '../../components/ProgressBar';
import { useActivitySummary } from '../progress/useActivitySummary';
import styles from './TodayCard.module.css';

// 홈 맨 위: 연속 학습일과 오늘 목표(한 줄 막대). 탭하면 설정 맨 위의 PROGRESS 요약으로 간다.
// 기록을 못 읽으면 통째로 숨긴다(홈의 나머지는 그대로)
export function TodayCard() {
  const a = useActivitySummary();
  if (!a) return null;
  const { count, goal } = a.goal;
  return (
    <Link to="/settings" className={styles.card} aria-label={`연속 ${a.streak}일, 오늘 목표 ${count} / ${goal}. 진도·설정 보기`}>
      <div className={styles.head}>
        <span className={styles.streak}>
          <IconFlame />
          <span className={styles.num}>{a.streak}</span>
          <span className={styles.unit} lang="ko">일 연속</span>
        </span>
        <span className={styles.goal}>{count} / {goal}</span>
      </div>
      <ProgressBar value={goal > 0 ? count / goal : 0} label="오늘 목표" />
    </Link>
  );
}
