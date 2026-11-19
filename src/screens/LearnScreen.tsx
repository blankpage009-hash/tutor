import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadNewLesson } from '../content/curriculumLoader';
import type { NewLesson } from '../content/lessonTypes';
import { finishNewStep, markNewStage } from '../db/progress';
import { newStagePath, nextNewStage } from '../newLessonFlow';
import courseStyles from './courses/Courses.module.css';
import { KeySentenceCard } from './learn/KeySentenceCard';
import { LearnNotes } from './learn/LearnNotes';
import styles from './learn/Learn.module.css';
import { NewLessonSteps } from './newLesson/NewLessonSteps';

// 새 레슨 STEP 1 설명(/n/:lessonId/learn): 핵심 문장·강세·듣기 + 설명·발음·실수. 읽는 단계라 들어오면 진도를 올린다
export function LearnScreen() {
  const { lessonId = '' } = useParams();
  const nav = useNavigate();
  const [lesson, setLesson] = useState<NewLesson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLesson(null);
    loadNewLesson(lessonId).then(setLesson, (e) => setError(String(e)));
  }, [lessonId]);

  useEffect(() => {
    // 설명은 읽는 단계라 판정할 끝이 없다. 열면 끝낸 것으로 친다 (사용자 결정 2026-11-18)
    if (!lesson) return;
    markNewStage(lesson.lessonId, lesson.levelCode, 'learn')
      .then(() => finishNewStep(lesson.lessonId, lesson.levelCode, 'learn'))
      .catch(() => undefined);
  }, [lesson]);

  if (error) return <p className={courseStyles.meta} lang="ko">{error}</p>;
  if (!lesson) return <p className={courseStyles.meta} lang="ko">불러오는 중…</p>;
  return (
    <>
      <BackLink to={`/curriculum/${lesson.levelCode}`} label={lesson.level} />
      <ScreenHeader eyebrow={`유닛 ${lesson.unit} · STEP 1 설명`} title={lesson.lessonTitle} />
      <NewLessonSteps lessonId={lesson.lessonId} current="learn" />
      <KeySentenceCard lessonId={lesson.lessonId} sentence={lesson.keySentence} />
      <LearnNotes lesson={lesson} />
      <div className={styles.actions}>
        <Button variant="primary" block onClick={() => nav(newStagePath(lesson.lessonId, nextNewStage('learn')))}>
          대화문으로
        </Button>
      </div>
    </>
  );
}
