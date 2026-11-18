import { useEffect, useState } from 'react';
import type { NewLesson } from '../../content/lessonTypes';
import { finishNewStep, getProgress, saveDrillPosition } from '../../db/progress';
import type { DrillPosition } from '../../db/types';

// 저장된 드릴 위치를 읽는다. undefined = 읽는 중, null = 없음(1회차부터)
export function useSavedDrillPosition(lessonId: string): DrillPosition | null | undefined {
  const [pos, setPos] = useState<DrillPosition | null | undefined>(undefined);
  useEffect(() => {
    setPos(undefined);
    getProgress(lessonId).then((p) => setPos(p?.drill ?? null), () => setPos(null));
  }, [lessonId]);
  return pos;
}

type Steps = { index: number; cleared: Set<string>; finished: boolean };

// 회차가 바뀔 때마다 위치를 남겨 다른 단계에 갔다 와도 이어서 한다.
// 60회를 마치면 드릴 단계를 끝냄으로 저장하고 위치는 지운다 — 다음엔 1회차부터 (사용자 결정 2026-11-18)
export function useKeepDrillPosition(lesson: NewLesson, steps: Steps): void {
  const { lessonId, levelCode } = lesson;
  const { index, cleared, finished } = steps;
  useEffect(() => {
    if (finished) return;
    saveDrillPosition(lessonId, levelCode, { index, cleared: [...cleared] }).catch(() => undefined);
  }, [lessonId, levelCode, index, cleared, finished]);
  useEffect(() => {
    if (!finished) return;
    finishNewStep(lessonId, levelCode, 'drill')
      .then(() => saveDrillPosition(lessonId, levelCode, undefined))
      .catch(() => undefined);
  }, [lessonId, levelCode, finished]);
}
