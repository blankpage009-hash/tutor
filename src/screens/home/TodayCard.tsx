import { Link } from 'react-router-dom';
import { ProgressBar } from '../../components/ProgressBar';
import courseStyles from '../courses/Courses.module.css';
import { useActivitySummary } from '../progress/useActivitySummary';
import { useCurriculumProgress } from '../progress/useCurriculumProgress';

// 홈 맨 위: 연속 학습일과 오늘 목표, 내 레벨. 탭하면 진도 화면. 기록을 못 읽으면 카드 자체를 숨긴다(홈의 나머지는 그대로)
export function TodayCard() {
  const a = useActivitySummary();
  const p = useCurriculumProgress();
  if (!a) return null;
  const level = p && p !== 'error' ? p.level : null;
  return (
    <Link to="/more/progress" className={courseStyles.row}>
      <span className={courseStyles.name} lang="ko">
        {a.goal.met ? '오늘 목표 달성!' : `오늘 ${a.goal.count} / ${a.goal.goal}`} · 연속 {a.streak}일
      </span>
      <div className={courseStyles.bar}>
        <ProgressBar value={Math.min(1, a.goal.count / a.goal.goal)} label="오늘 목표" />
      </div>
      {level && (
        <p className={courseStyles.meta} lang="ko">
          내 레벨 {level.name}{level.ready > 0 ? ` · ${level.done}/${level.ready} 레슨` : ''} · 진도 보기
        </p>
      )}
    </Link>
  );
}
