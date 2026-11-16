import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadLesson } from '../content/loader';
import type { Course, Lesson } from '../content/types';
import { markStage } from '../db/progress';
import styles from './courses/Courses.module.css';

// 짧은 수업(PLAN 5.2 ①): 문장 소개 + 한국어 뜻 + 쓰임 메모. 읽기만 하는 단계라 "시작"을 누르면 진도가 올라간다
export function LessonScreen() {
  const { lessonId = '' } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<{ course: Course; lesson: Lesson } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    loadLesson(lessonId).then(setData, (e) => setError(String(e)));
  }, [lessonId]);

  useEffect(() => {
    if (data) markStage(data.lesson.id, data.course.id, 'intro').catch(() => undefined);
  }, [data]);

  if (error) return <p className={styles.meta} lang="ko">{error}</p>;
  if (!data) return <p className={styles.meta} lang="ko">불러오는 중…</p>;
  const { course, lesson } = data;
  const start = () => {
    // 쉐도잉 화면이 진도를 올리지만, 저장이 늦어도 화면 이동은 막지 않는다
    nav(`/shadowing/${lesson.id}`);
  };
  return (
    <>
      <BackLink to={`/courses/${course.id}`} label={course.titleKo} />
      <ScreenHeader eyebrow={`${course.titleKo} · 짧은 수업`} title={lesson.titleKo} />
      <p className={styles.intro} lang="ko">{lesson.intro}</p>
      {lesson.sentences.map((s) => (
        <div key={s.id} className={styles.sentence}>
          <p className={styles.en} lang="en">{s.en}</p>
          <p className={styles.meta} lang="ko">{s.ko}</p>
          <p className={styles.meta} lang="ko">{s.note}</p>
        </div>
      ))}
      <div className={styles.actions}>
        <Button variant="primary" block onClick={start}>쉐도잉 시작</Button>
      </div>
    </>
  );
}
