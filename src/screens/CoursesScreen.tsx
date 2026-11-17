import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadCourse, loadManifest } from '../content/loader';
import type { Course } from '../content/types';
import { countDone } from '../lessonFlow';
import styles from './courses/Courses.module.css';
import sectionStyles from './curriculum/Curriculum.module.css';
import { CurriculumSection } from './curriculum/CurriculumSection';
import { useProgressMap } from './courses/useProgressMap';

// 코스 간 잠금 없음(PLAN 5.1). 10개를 모두 열어 두고, 코스별 완료 수업 수만 보여 준다
export function CoursesScreen() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = useProgressMap();

  useEffect(() => {
    loadManifest()
      .then((m) => Promise.all([...m.courses].sort((a, b) => a.order - b.order).map((c) => loadCourse(c.id))))
      .then(setCourses, (e) => setError(String(e)));
  }, []);

  return (
    <>
      <ScreenHeader eyebrow="코스" title="코스" />
      {/* 전환 기간(PLAN Phase 5.5): 새 커리큘럼을 위에, 기존 10코스를 아래에 함께 보여 준다 */}
      <h2 className={sectionStyles.section} lang="ko">새 커리큘럼</h2>
      <CurriculumSection progress={progress} />
      <h2 className={sectionStyles.section} lang="ko">기존 코스</h2>
      {error &&<p className={styles.meta} lang="ko">{error}</p>}
      {!courses && !error && <p className={styles.meta} lang="ko">불러오는 중…</p>}
      <ul className={styles.list}>
        {courses?.map((c) => {
          const done = countDone(c.lessons, progress);
          return (
            <li key={c.id}>
              <Link to={`/courses/${c.id}`} className={styles.row}>
                <div className={styles.rowHead}>
                  <span className={styles.name} lang="ko">{c.titleKo}</span>
                  <span className={styles.badge} lang="ko">{done} / {c.lessons.length}</span>
                </div>
                <p className={styles.meta} lang="en">{c.title}</p>
                <div className={styles.bar}><ProgressBar value={done / c.lessons.length} label={`${c.titleKo} 진도`} /></div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
