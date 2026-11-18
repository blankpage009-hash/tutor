import { useEffect, useState } from 'react';
import { loadNewLesson } from '../../content/curriculumLoader';
import type { NewLesson } from '../../content/lessonTypes';
import { markNewStage } from '../../db/progress';
import type { NewLessonStep } from '../../newLessonFlow';

// 레슨을 불러오고, 불러오면 이 단계까지 왔다고 진도를 남긴다 (LearnScreen과 같은 방식: 들어오면 기록)
export function useNewLesson(lessonId: string, stage: NewLessonStep) {
  const [lesson, setLesson] = useState<NewLesson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLesson(null);
    loadNewLesson(lessonId).then(setLesson, (e) => setError(String(e)));
  }, [lessonId]);

  useEffect(() => {
    if (lesson) markNewStage(lesson.lessonId, lesson.levelCode, stage).catch(() => undefined);
  }, [lesson, stage]);

  return { lesson, error };
}
