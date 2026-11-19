import { useCallback, useEffect, useState } from 'react';
import type { Lesson, Sentence } from '../../content/types';
import { savedIdsAmong, saveSentence } from '../../db/savedSentences';

// 이 수업 문장 중 저장된 것과, 저장 버튼 처리
export function useSavedSentences(lesson: Lesson | null, courseId: string | null, log: (m: string) => void) {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson) return;
    savedIdsAmong(lesson.sentences.map((s) => s.id)).then(setSaved, (e) => log(`저장 목록 읽기 실패: ${String(e)}`));
  }, [lesson, log]);

  const save = useCallback(async (s: Sentence) => {
    if (!lesson || !courseId) return;
    setError(null);
    try {
      const ok = await saveSentence({ id: s.id, courseId, lessonId: lesson.id, en: s.en, ko: s.ko, audio: s.audio });
      log(ok ? `저장함: ${s.id}` : `저장했는데 다시 읽히지 않음: ${s.id}`);
      if (ok) setSaved((prev) => new Set(prev).add(s.id));
      else setError('저장이 안 됐어요. 다시 눌러 주세요.');
    } catch (e) {
      log(`저장 실패: ${String(e)}`);
      setError('저장이 안 됐어요. 다시 눌러 주세요.');
    }
  }, [lesson, courseId, log]);

  return { saved, save, error };
}
