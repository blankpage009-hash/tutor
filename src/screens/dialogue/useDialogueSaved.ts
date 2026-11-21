import { useCallback, useEffect, useRef, useState } from 'react';
import type { DialogueLine, NewLesson } from '../../content/lessonTypes';
import { removeSaved, savedIdsAmong, saveSentence } from '../../db/savedSentences';

// 단어 저장(TapText)의 출처 이름과 같은 모양이라, 보관함·단어장이 같은 줄을 같은 이름으로 가리킨다
export function dialogueSaveId(lessonId: string, line: DialogueLine): string {
  return `${lessonId}-dlg${line.no}`;
}

// 대화문 줄 저장 (사용자 요청 2026-11-21: 내 줄·튜터 줄 모두). 드릴 저장(useDrillSaved)과 같은 규칙:
// 켜고 끄는 스위치이고, 글자·음성도 함께 적어 두어 보관함 드릴 연습에 바로 쓰인다
export function useDialogueSaved(lesson: NewLesson) {
  const lines = lesson.dialogue.lines;
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // 저장·해제가 끝나기 전에 또 누르면 무시한다. 빠르게 두 번 누르면 둘 다 "저장"으로 읽혀 해제가 안 되기 때문
  const busy = useRef(false);

  useEffect(() => {
    savedIdsAmong(lines.map((l) => dialogueSaveId(lesson.lessonId, l)))
      .then(setSaved, (e) => console.debug(`[대화문] 저장 목록 읽기 실패: ${String(e)}`));
  }, [lines, lesson.lessonId]);

  // 지운 뒤 다시 읽어 확인한다. iOS 홈화면 앱에서 조용히 실패해도 "해제됨"으로 보이지 않게
  const write = useCallback(async (line: DialogueLine, on: boolean) => {
    const id = dialogueSaveId(lesson.lessonId, line);
    if (!on) {
      return saveSentence({ id, courseId: lesson.levelCode, lessonId: lesson.lessonId, en: line.en, ko: line.ko, audio: line.audio });
    }
    await removeSaved(id);
    return !(await savedIdsAmong([id])).has(id);
  }, [lesson.lessonId, lesson.levelCode]);

  const toggle = useCallback(async (line: DialogueLine) => {
    const id = dialogueSaveId(lesson.lessonId, line);
    const on = saved.has(id);
    const fail = on ? '해제가 안 됐어요. 다시 눌러 주세요.' : '저장이 안 됐어요. 다시 눌러 주세요.';
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      if (!(await write(line, on))) return setError(fail);
      setSaved((prev) => {
        const next = new Set(prev);
        if (on) next.delete(id);
        else next.add(id);
        return next;
      });
    } catch (e) {
      console.debug(`[대화문] ${on ? '해제' : '저장'} 실패: ${String(e)}`);
      setError(fail);
    } finally {
      busy.current = false;
    }
  }, [saved, write, lesson.lessonId]);

  const isSaved = useCallback((line: DialogueLine) => saved.has(dialogueSaveId(lesson.lessonId, line)), [saved, lesson.lessonId]);
  return { isSaved, toggle, error };
}

export type DialogueSaved = ReturnType<typeof useDialogueSaved>;
