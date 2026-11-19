import { Link } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { percent, type CurriculumStat, type LevelStat } from '../levelProgress';
import courseStyles from './courses/Courses.module.css';
import homeStyles from './HomeScreen.module.css';
import styles from './progress/Progress.module.css';
import { useActivitySummary } from './progress/useActivitySummary';
import { useCurriculumProgress } from './progress/useCurriculumProgress';

function LevelCard({ level }: { level: LevelStat | null }) {
  if (!level) return null;
  return (
    <Link to={`/curriculum/${level.key}`} className={courseStyles.row}>
      <span className={courseStyles.name} lang="ko">{level.name}</span>
      <p className={courseStyles.meta} lang="ko">
        {level.ready === 0 ? '아직 준비된 레슨이 없어요' : `${level.done} / ${level.ready} 레슨 완료 · 탭해서 이어서 하기`}
      </p>
      {level.ready > 0 && <div className={courseStyles.bar}><ProgressBar value={level.done / level.ready} label={`${level.name} 진도`} /></div>}
    </Link>
  );
}

function Habit() {
  const a = useActivitySummary();
  if (!a) return null;
  return (
    <div className={styles.stats}>
      <div className={styles.stat}>
        <p className={styles.statValue} lang="ko">{a.streak}일</p>
        <p className={styles.statLabel} lang="ko">연속 학습 (최장 {a.longest}일)</p>
      </div>
      <div className={styles.stat}>
        <p className={`${styles.statValue} ${a.goal.met ? styles.met : ''}`} lang="ko">{a.goal.count} / {a.goal.goal}</p>
        <p className={styles.statLabel} lang="ko">{a.goal.met ? '오늘 목표 달성!' : '오늘 연습 횟수'}</p>
      </div>
    </div>
  );
}

function Overall({ stat }: { stat: CurriculumStat }) {
  return (
    <>
      <p className={styles.big} lang="ko">{percent(stat.done, stat.ready)}%</p>
      <p className={courseStyles.meta} lang="ko">
        준비된 {stat.ready}레슨 중 {stat.done}개 완료 · 전체 커리큘럼 {stat.total}레슨 중 {stat.ready}개가 열려 있어요
      </p>
      <div className={courseStyles.bar}><ProgressBar value={stat.ready === 0 ? 0 : stat.done / stat.ready} label="전체 진도" /></div>
    </>
  );
}

function LevelList({ stat, currentKey }: { stat: CurriculumStat; currentKey: string | undefined }) {
  return (
    <>
      {stat.courses.map((course) => (
        <div key={course.name}>
          <h2 className={homeStyles.sub} lang="ko">{course.name} · {course.done}/{course.ready}</h2>
          {course.levels.map((l) => (
            <Link key={l.key} to={`/curriculum/${l.key}`} className={`${styles.levelRow} ${l.key === currentKey ? styles.current : ''}`}>
              <span className={courseStyles.rowHead}>
                <span className={courseStyles.name} lang="ko">{l.name}{l.key === currentKey ? ' (내 레벨)' : ''}</span>
                <span className={`${courseStyles.badge} ${l.ready === 0 ? styles.pending : ''}`} lang="ko">
                  {l.ready === 0 ? '준비 중' : `${l.done}/${l.ready}`}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ))}
    </>
  );
}

// 새 커리큘럼 기준의 진도. 옛 10코스는 전환 기간이라 여기에 넣지 않는다
export function ProgressScreen() {
  const p = useCurriculumProgress();
  return (
    <>
      <BackLink to="/" label="오늘" />
      <ScreenHeader eyebrow="오늘" title="진도 · 레벨" />
      {p === null && <p className={homeStyles.note} lang="ko">불러오는 중…</p>}
      {p === 'error' && <p className={homeStyles.note} lang="ko">커리큘럼 목록을 못 읽었어요. 인터넷 연결을 확인하고 다시 열어 주세요.</p>}
      {p && p !== 'error' && (
        <>
          <h2 className={homeStyles.sub}>내 레벨</h2>
          <LevelCard level={p.level} />
          <h2 className={homeStyles.sub}>습관</h2>
          <Habit />
          <h2 className={homeStyles.sub}>전체 진도</h2>
          <Overall stat={p.stat} />
          <LevelList stat={p.stat} currentKey={p.level?.key} />
          <p className={homeStyles.note} lang="ko">시작 레벨과 일일 목표는 <Link to="/settings">설정</Link>에서 바꿀 수 있어요.</p>
        </>
      )}
    </>
  );
}
