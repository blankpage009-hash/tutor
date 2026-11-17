import { useCallback, useEffect, useState } from 'react';
import type { NewLesson } from '../../content/lessonTypes';
import { savedIdsAmong, saveSentence } from '../../db/savedSentences';
import { drillSaveId } from '../../drillPlan';

// 드릴 문장 저장: 회차가 아니라 문장 단위 id(INT1-U01-L01-d1)로, courseId 칸에는 레벨 코드를 넣는다
export function useDrillSaved(lesson: NewLesson, log: (m: string) => void) {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = lesson.drills.map((d) => drillSaveId(lesson.lessonId, d.id));
    savedIdsAmong(ids).then(setSaved, (e) => log(`저장 목록 읽기 실패: ${String(e)}`));
  }, [lesson, log]);

  const save = useCallback(async (id: string) => {
    setError(null);
    try {
      const ok = await saveSentence({ id, courseId: lesson.levelCode, lessonId: lesson.lessonId });
      if (ok) setSaved((prev) => new Set(prev).add(id));
      else setError('저장이 안 됐어요. 다시 눌러 주세요.');
    } catch (e) {
      log(`저장 실패: ${String(e)}`);
      setError('저장이 안 됐어요. 다시 눌러 주세요.');
    }
  }, [lesson, log]);

  return { saved, save, error };
}
