import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadCourse } from '../content/loader';
import type { Course } from '../content/types';
import { STAGE_LABEL, stagePath } from '../lessonFlow';
import styles from './courses/Courses.module.css';
import { useProgressMap } from './courses/useProgressMap';

export function CourseDetailScreen() {
  const { courseId = '' } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = useProgressMap();

  useEffect(() => {
    setCourse(null);
    loadCourse(courseId).then(setCourse, (e) => setError(String(e)));
  }, [courseId]);

  return (
    <>
      <BackLink to="/courses" label="코스" />
      <ScreenHeader eyebrow={course?.title} title={course?.titleKo ?? '코스'} />
      {error && <p className={styles.meta} lang="ko">{error}</p>}
      {!course && !error && <p className={styles.meta} lang="ko">불러오는 중…</p>}
      {course && <p className={styles.intro} lang="ko">{course.description}</p>}
      <ul className={styles.list}>
        {course?.lessons.map((l, i) => {
          const stage = progress.get(l.id)?.stage;
          // 진행 중이던 단계로 바로 이어 들어간다. 끝낸 수업은 처음(짧은 수업)부터 다시
          const to = stagePath(l.id, stage && stage !== 'done' ? stage : 'intro');
          return (
            <li key={l.id}>
              <Link to={to} className={styles.row}>
                <div className={styles.rowHead}>
                  <span className={styles.name} lang="ko">{i + 1}. {l.titleKo}</span>
                  {stage && <span className={styles.badge} lang="ko">{stage === 'done' ? '완료' : `${STAGE_LABEL[stage]} 중`}</span>}
                </div>
                <p className={styles.meta} lang="en">{l.title}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
