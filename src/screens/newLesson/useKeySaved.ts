import { useCallback, useEffect, useState } from 'react';
import type { NewLesson } from '../../content/lessonTypes';
import { savedIdsAmong, saveSentence } from '../../db/savedSentences';

// 레슨 화면 북마크 = 핵심 문장을 보관함에 저장 (드릴 카드의 북마크와 같은 동작, 사용자 결정 2026-11-20).
// 드릴 문장 id(-d1)와 겹치지 않게 -key를 붙이고, courseId 칸에는 드릴처럼 레벨 코드를 넣는다
export function useKeySaved(lesson: NewLesson) {
  const id = `${lesson.lessonId}-key`;
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    savedIdsAmong([id]).then((s) => setSaved(s.has(id)), () => undefined);
  }, [id]);

  const save = useCallback(async () => {
    setError(null);
    try {
      const ok = await saveSentence({
        id, courseId: lesson.levelCode, lessonId: lesson.lessonId,
        en: lesson.keySentence.en, ko: lesson.keySentence.ko, audio: lesson.keySentence.audio.normal
      });
      if (ok) setSaved(true);
      else setError('저장이 안 됐어요. 다시 눌러 주세요.');
    } catch {
      setError('저장이 안 됐어요. 다시 눌러 주세요.');
    }
  }, [id, lesson]);

  return { saved, save, error };
}
