import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadNewLesson } from '../content/curriculumLoader';
import type { NewLesson } from '../content/lessonTypes';
import { NEW_STEPS, NEW_STEP_ENGLISH, newStagePath } from '../newLessonFlow';
import courseStyles from './courses/Courses.module.css';
import styles from './newLesson/NewLessonMenu.module.css';

// 새 레슨 진입 화면(/n/:lessonId): 4단계 버튼만 보여 주고, 누르면 그 수업 화면으로 간다.
// 진도는 여기서 올리지 않는다 — 각 단계 화면이 열릴 때 기존 방식대로 기록한다
export function NewLessonMenuScreen() {
  const { lessonId = '' } = useParams();
  const nav = useNavigate();
  const [lesson, setLesson] = useState<NewLesson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLesson(null);
    loadNewLesson(lessonId).then(setLesson, (e) => setError(String(e)));
  }, [lessonId]);

  if (error) return <p className={courseStyles.meta} lang="ko">{error}</p>;
  if (!lesson) return <p className={courseStyles.meta} lang="ko">불러오는 중…</p>;
  return (
    <>
      <BackLink to={`/curriculum/${lesson.levelCode}`} label={lesson.level} />
      <ScreenHeader eyebrow={`유닛 ${lesson.unit}`} title={lesson.lessonTitle} />
      <div className={styles.list}>
        {NEW_STEPS.map((step) => (
          <Button key={step} variant="secondary" block className={styles.btn}
            onClick={() => nav(newStagePath(lesson.lessonId, step))}>
            {NEW_STEP_ENGLISH[step]}
          </Button>
        ))}
      </div>
    </>
  );
}
