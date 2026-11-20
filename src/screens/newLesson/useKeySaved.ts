import { useCallback, useEffect, useRef, useState } from 'react';
import type { NewLesson } from '../../content/lessonTypes';
import { removeSaved, savedIdsAmong, saveSentence } from '../../db/savedSentences';

// 레슨 화면·설명 화면 북마크 = 핵심 문장을 보관함에 저장 (드릴 카드의 북마크와 같은 동작, 사용자 결정 2026-11-20).
// 드릴 문장 id(-d1)와 겹치지 않게 -key를 붙이고, courseId 칸에는 드릴처럼 레벨 코드를 넣는다.
// 켜고 끄는 스위치 — 저장된 문장을 다시 누르면 보관함에서 뺀다. 빼면 복습 기록도 함께 지워진다 (사용자 요청 2026-11-20)
export function useKeySaved(lesson: NewLesson) {
  const id = `${lesson.lessonId}-key`;
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 저장·해제가 끝나기 전에 또 누르면 무시한다. 빠르게 두 번 누르면 둘 다 "저장"으로 읽혀 해제가 안 되기 때문
  const busy = useRef(false);

  useEffect(() => {
    savedIdsAmong([id]).then((s) => setSaved(s.has(id)), () => undefined);
  }, [id]);

  const add = useCallback(() => saveSentence({
    id, courseId: lesson.levelCode, lessonId: lesson.lessonId,
    en: lesson.keySentence.en, ko: lesson.keySentence.ko, audio: lesson.keySentence.audio.normal
  }), [id, lesson]);

  // 지운 뒤 다시 읽어 확인한다. iOS 홈화면 앱에서 조용히 실패해도 "해제됨"으로 보이지 않게 (저장과 같은 이유)
  const remove = useCallback(async () => {
    await removeSaved(id);
    return !(await savedIdsAmong([id])).has(id);
  }, [id]);

  const toggle = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const fail = saved ? '해제가 안 됐어요. 다시 눌러 주세요.' : '저장이 안 됐어요. 다시 눌러 주세요.';
    setError(null);
    try {
      if (await (saved ? remove() : add())) setSaved(!saved);
      else setError(fail);
    } catch {
      setError(fail);
    } finally {
      busy.current = false;
    }
  }, [saved, add, remove]);

  return { saved, toggle, error };
}
