import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { IconChevronRight } from '../components/icons/icons';
import { loadNewLesson } from '../content/curriculumLoader';
import type { NewLesson } from '../content/lessonTypes';
import { finishNewStep, markNewStage } from '../db/progress';
import { newStagePath, nextNewStage } from '../newLessonFlow';
import { KeySentenceCard } from './learn/KeySentenceCard';
import { LearnNotes } from './learn/LearnNotes';
import styles from './learn/Learn.module.css';
import { LessonStepBar } from './newLesson/LessonStepBar';

// 설명은 읽는 단계라 진행을 잴 끝이 없다. 시안처럼 지금 칸을 반만 채워 "보는 중"으로 보인다
const LEARN_FILL = 0.5;

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

  if (error) return <p className={styles.note} lang="ko">{error}</p>;
  if (!lesson) return <p className={styles.note} lang="ko">불러오는 중…</p>;
  return (
    <div className={styles.page}>
      <LessonStepBar lessonId={lesson.lessonId} current="learn" fill={LEARN_FILL} />
      <p className={styles.title} lang="ko">{lesson.lessonTitle}</p>
      <KeySentenceCard lesson={lesson} />
      <LearnNotes lesson={lesson} />
      <Button variant="primary" block className={styles.next}
        onClick={() => nav(newStagePath(lesson.lessonId, nextNewStage('learn')))}>
        <IconChevronRight />Next: Dialogue
      </Button>
    </div>
  );
}
