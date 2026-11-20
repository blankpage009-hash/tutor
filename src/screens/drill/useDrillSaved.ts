import { useCallback, useEffect, useRef, useState } from 'react';
import type { NewLesson } from '../../content/lessonTypes';
import { removeSaved, savedIdsAmong, saveSentence } from '../../db/savedSentences';
import { drillSaveId } from '../../drillPlan';

// 드릴 문장 저장: 회차가 아니라 문장 단위 id(INT1-U01-L01-d1)로, courseId 칸에는 레벨 코드를 넣는다.
// 북마크는 켜고 끄는 스위치 — 저장된 문장을 다시 누르면 보관함에서 뺀다 (사용자 요청 2026-11-20).
// 빼면 복습 기록도 함께 지워진다 (보관함에서 지울 때와 같은 removeSaved)
export function useDrillSaved(lesson: NewLesson, log: (m: string) => void) {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // 저장·해제가 끝나기 전에 또 누르면 무시한다. 빠르게 두 번 누르면 둘 다 "저장"으로 읽혀 해제가 안 되기 때문
  const busy = useRef(false);

  useEffect(() => {
    const ids = lesson.drills.map((d) => drillSaveId(lesson.lessonId, d.id));
    savedIdsAmong(ids).then(setSaved, (e) => log(`저장 목록 읽기 실패: ${String(e)}`));
  }, [lesson, log]);

  const add = useCallback(async (id: string) => {
    const drill = lesson.drills.find((d) => drillSaveId(lesson.lessonId, d.id) === id);
    return saveSentence({
      id, courseId: lesson.levelCode, lessonId: lesson.lessonId,
      en: drill?.en, ko: drill?.ko, audio: drill?.audio.normal
    });
  }, [lesson]);

  // 지운 뒤 다시 읽어 확인한다. iOS 홈화면 앱에서 조용히 실패해도 "해제됨"으로 보이지 않게 (저장과 같은 이유)
  const remove = useCallback(async (id: string) => {
    await removeSaved(id);
    return !(await savedIdsAmong([id])).has(id);
  }, []);

  const toggle = useCallback(async (id: string) => {
    const on = saved.has(id);
    const fail = on ? '해제가 안 됐어요. 다시 눌러 주세요.' : '저장이 안 됐어요. 다시 눌러 주세요.';
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      if (!(await (on ? remove(id) : add(id)))) return setError(fail);
      setSaved((prev) => {
        const next = new Set(prev);
        if (on) next.delete(id);
        else next.add(id);
        return next;
      });
    } catch (e) {
      log(`${on ? '해제' : '저장'} 실패: ${String(e)}`);
      setError(fail);
    } finally {
      busy.current = false;
    }
  }, [saved, add, remove, log]);

  return { saved, toggle, error };
}
