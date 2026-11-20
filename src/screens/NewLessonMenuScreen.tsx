import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconBookmark, IconClose } from '../components/icons/icons';
import { loadNewLesson } from '../content/curriculumLoader';
import type { NewLesson } from '../content/lessonTypes';
import { focusStep, type NewLessonStep } from '../newLessonFlow';
import { KeySentenceBox } from './newLesson/KeySentenceBox';
import { LessonTiles } from './newLesson/LessonTiles';
import { useKeySaved } from './newLesson/useKeySaved';
import { useLessonProgress } from './newLesson/useLessonProgress';
import styles from './newLesson/LessonView.module.css';

const pad2 = (n: number) => String(n).padStart(2, '0');

// 새 레슨 진입 화면(/n/:lessonId): 핵심 문장과 4단계 타일. 진도는 여기서 올리지 않는다 —
// 각 단계 화면이 열릴 때 기존 방식대로 기록한다
export function NewLessonMenuScreen() {
  const { lessonId = '' } = useParams();
  const [lesson, setLesson] = useState<NewLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const row = useLessonProgress(lessonId);

  useEffect(() => {
    setLesson(null);
    setError(null);
    loadNewLesson(lessonId).then(setLesson, (e) => setError(String(e)));
  }, [lessonId]);

  if (error) return <p className={styles.note} lang="ko">{error}</p>;
  if (!lesson || row === undefined) return <p className={styles.note} lang="ko">불러오는 중…</p>;
  return <LessonView lesson={lesson} stage={row?.stage} steps={row?.steps ?? []} />;
}

function LessonView({ lesson, stage, steps }: { lesson: NewLesson; stage?: string; steps: NewLessonStep[] }) {
  const key = useKeySaved(lesson);
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        {/* 닫기: 이 레슨이 있던 유닛이 펼쳐진 코스 목록으로 돌아간다 */}
        <Link to={`/courses?level=${encodeURIComponent(lesson.levelCode)}&unit=${lesson.unit}`}
          className={styles.iconBtn} aria-label="닫기"><IconClose /></Link>
        <button type="button" className={styles.iconBtn} onClick={() => { void key.save(); }} disabled={key.saved}
          aria-label={key.saved ? '핵심 문장 저장됨' : '핵심 문장을 보관함에 저장'}>
          <IconBookmark filled={key.saved} />
        </button>
      </div>
      <header className={styles.head}>
        <span className={`${styles.label} ${styles.where}`} lang="ko">
          {lesson.level} · UNIT {lesson.unit} · L{pad2(lesson.lessonNo)}
        </span>
        <h1 className={styles.title} lang="ko">{lesson.lessonTitle}</h1>
      </header>
      {key.error && <p className={styles.error} lang="ko">{key.error}</p>}
      <KeySentenceBox sentence={lesson.keySentence} />
      <LessonTiles lessonId={lesson.lessonId} focus={focusStep(stage, steps)} steps={steps} />
      <span className={`${styles.label} ${styles.about}`}>About {lesson.estimatedMinutes} min</span>
    </div>
  );
}
