import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadLevel } from '../content/curriculumLoader';
import type { CurriculumLevel } from '../content/lessonTypes';
import courseStyles from './courses/Courses.module.css';
import { useProgressMap } from './courses/useProgressMap';
import styles from './curriculum/Curriculum.module.css';
import { LessonRow } from './curriculum/LessonRow';

// 레벨 화면(/curriculum/:levelKey): 유닛별 레슨 목록. 아직 안 만든 레슨은 회색 "준비 중"으로 누를 수 없다
export function CurriculumLevelScreen() {
  const { levelKey = '' } = useParams();
  const [level, setLevel] = useState<CurriculumLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = useProgressMap();

  useEffect(() => {
    setLevel(null);
    loadLevel(levelKey).then(setLevel, (e) => setError(String(e)));
  }, [levelKey]);

  return (
    <>
      <BackLink to="/courses" label="코스" />
      <ScreenHeader eyebrow={level?.code ?? '새 커리큘럼'} title={level?.name ?? '레벨'} />
      {error && <p className={courseStyles.meta} lang="ko">{error}</p>}
      {!level && !error && <p className={courseStyles.meta} lang="ko">불러오는 중…</p>}
      {level?.units.map((u) => (
        <Fragment key={u.no}>
          <h2 className={styles.group} lang="ko">유닛 {u.no} · {u.title}</h2>
          <ul className={courseStyles.list}>
            {u.lessons.map((l) => <LessonRow key={l.no} lesson={l} progress={progress} />)}
          </ul>
        </Fragment>
      ))}
    </>
  );
}
