import { ProgressBar } from '../../components/ProgressBar';
import { SettingsRow } from '../../components/SettingsRow';
import type { CurriculumProgress } from '../progress/useCurriculumProgress';
import { useActivitySummary } from '../progress/useActivitySummary';
import styles from './Settings.module.css';

type Props = { progress: CurriculumProgress | 'error' | null };

function Level({ progress }: Props) {
  if (progress === 'error') return <p className={styles.note} lang="ko">레벨 정보를 못 읽었어요. 인터넷 연결을 확인하고 다시 열어 주세요.</p>;
  if (!progress?.level) return null;
  const { name, done, ready } = progress.level;
  return (
    <div className={styles.level}>
      <div className={styles.levelHead}>
        <span className={styles.small}>MY LEVEL</span>
        {ready > 0 && <span className={styles.count}>{done} / {ready}</span>}
      </div>
      <p className={styles.levelName} lang="ko">{name}</p>
      {ready > 0
        ? <ProgressBar value={done / ready} label={`${name} 진도`} segments={ready} />
        : <span className={styles.small}>SOON</span>}
    </div>
  );
}

function Habit() {
  const a = useActivitySummary();
  if (!a) return null;
  return (
    <div className={styles.stats}>
      <div className={styles.stat}>
        <span className={styles.small}>STREAK</span>
        <p className={styles.statValue}>{a.streak}</p>
      </div>
      <div className={styles.stat}>
        <span className={styles.small}>BEST</span>
        <p className={styles.statValue}>{a.longest}</p>
      </div>
      <div className={styles.stat}>
        <span className={styles.small}>TODAY</span>
        <p className={`${styles.statValue} ${a.goal.met ? styles.met : ''}`}>{a.goal.count}/{a.goal.goal}</p>
      </div>
    </div>
  );
}

// 설정 맨 위: 내 레벨, 연속·최장·오늘 횟수, 전체 레벨 목록으로 가는 줄.
// 기록을 못 읽은 부분은 조용히 숨기고 나머지 설정은 그대로 쓰게 한다
export function ProgressSummary({ progress }: Props) {
  return (
    <>
      <h2 className={styles.section}>PROGRESS</h2>
      <Level progress={progress} />
      <Habit />
      <SettingsRow name="All Levels" to="/settings/progress" />
    </>
  );
}
