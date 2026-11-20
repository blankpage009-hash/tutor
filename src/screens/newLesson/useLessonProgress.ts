import { useEffect, useState } from 'react';
import { getProgress } from '../../db/progress';
import type { LessonProgress } from '../../db/types';

// undefined = 읽는 중, null = 이 레슨은 아직 한 번도 안 들어감. 읽기에 실패해도 "처음"으로 보고 계속 보여 준다
export function useLessonProgress(lessonId: string): LessonProgress | null | undefined {
  const [row, setRow] = useState<LessonProgress | null | undefined>(undefined);
  useEffect(() => {
    setRow(undefined);
    getProgress(lessonId).then((r) => setRow(r ?? null), () => setRow(null));
  }, [lessonId]);
  return row;
}
