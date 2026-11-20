import { Link } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { percent, type CurriculumStat } from '../levelProgress';
import homeStyles from './HomeScreen.module.css';
import styles from './progress/Progress.module.css';
import { useCurriculumProgress } from './progress/useCurriculumProgress';

function Overall({ stat }: { stat: CurriculumStat }) {
  return (
    <div className={styles.overall}>
      <div className={styles.overallHead}>
        <span className={styles.label}>OVERALL</span>
        <span className={styles.big}>{percent(stat.done, stat.ready)}%</span>
      </div>
      <ProgressBar value={stat.ready === 0 ? 0 : stat.done / stat.ready} label="전체 진도" />
      <p className={styles.meta} lang="ko">
        준비된 {stat.ready}레슨 중 {stat.done}개 완료 · 전체 커리큘럼 {stat.total}레슨
      </p>
    </div>
  );
}

function LevelList({ stat, currentKey }: { stat: CurriculumStat; currentKey: string | undefined }) {
  return (
    <>
      {stat.courses.map((course) => (
        <section key={course.name}>
          <h2 className={styles.course} lang="ko">{course.name} · {course.done}/{course.ready}</h2>
          {course.levels.map((l) => (
            <Link key={l.key} to={`/courses?level=${encodeURIComponent(l.key)}`} className={`${styles.levelRow} ${l.key === currentKey ? styles.current : ''}`}>
              <span className={styles.levelName} lang="ko">
                {l.name}
                {l.key === currentKey && <span className={styles.tag}>MY LEVEL</span>}
              </span>
              <span className={`${styles.badge} ${l.ready === 0 ? styles.pending : ''}`}>
                {l.ready === 0 ? 'SOON' : `${l.done} / ${l.ready}`}
              </span>
            </Link>
          ))}
        </section>
      ))}
    </>
  );
}

// 새 커리큘럼 기준의 전체 레벨 목록. 내 레벨과 연속 학습일은 설정 맨 위 요약으로 옮겼다
export function ProgressScreen() {
  const p = useCurriculumProgress();
  return (
    <>
      <BackLink to="/settings" label="Settings" />
      <ScreenHeader eyebrow="PROGRESS" title="All Levels" />
      {p === null && <p className={homeStyles.note} lang="ko">불러오는 중…</p>}
      {p === 'error' && <p className={homeStyles.note} lang="ko">커리큘럼 목록을 못 읽었어요. 인터넷 연결을 확인하고 다시 열어 주세요.</p>}
      {p && p !== 'error' && (
        <>
          <Overall stat={p.stat} />
          <LevelList stat={p.stat} currentKey={p.level?.key} />
        </>
      )}
    </>
  );
}
