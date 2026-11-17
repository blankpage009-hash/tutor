import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { levelLessons, loadCurriculum } from '../../content/curriculumLoader';
import type { Curriculum } from '../../content/lessonTypes';
import type { ProgressMap } from '../../lessonFlow';
import courseStyles from '../courses/Courses.module.css';
import styles from './Curriculum.module.css';

type Props = { progress: ProgressMap };

// 코스 화면 위쪽: 새 커리큘럼(과정 → 레벨). 레벨마다 끝낸 레슨 수 / 만든 레슨 수를 보여 준다
export function CurriculumSection({ progress }: Props) {
  const [data, setData] = useState<Curriculum | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurriculum().then(setData, (e) => setError(String(e)));
  }, []);

  if (error) return <p className={courseStyles.meta} lang="ko">{error}</p>;
  if (!data) return <p className={courseStyles.meta} lang="ko">불러오는 중…</p>;
  return (
    <>
      {data.courses.map((course) => (
        <Fragment key={course.name}>
          <h3 className={styles.group} lang="ko">{course.name}</h3>
          <ul className={courseStyles.list}>
            {course.levels.map((level) => {
              const lessons = levelLessons(level);
              const ready = lessons.filter((l) => l.ready).length;
              const done = lessons.filter((l) => l.id && progress.get(l.id)?.stage === 'done').length;
              return (
                <li key={level.key}>
                  <Link to={`/curriculum/${level.key}`} className={courseStyles.row}>
                    <div className={courseStyles.rowHead}>
                      <span className={courseStyles.name} lang="ko">{level.name}</span>
                      <span className={ready ? styles.badge : `${styles.badge} ${styles.disabled}`} lang="ko">
                        {ready ? `${done} / ${ready}` : '준비 중'}
                      </span>
                    </div>
                    <p className={courseStyles.meta} lang="ko">유닛 {level.units.length}개 · 레슨 {lessons.length}개</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Fragment>
      ))}
    </>
  );
}
