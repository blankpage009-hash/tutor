import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lesson } from '../../content/types';
import { addPass, clearedIds, justCleared } from './lessonSteps';

// PLAN 5.3: 자동 넘기기를 켜면 통과 후 1.5초 뒤 다음 문장
const AUTO_ADVANCE_MS = 1500;

// 수업 안에서 지금 몇 번째 문장인지, 문장마다 몇 번 통과했는지
export function useLessonSteps(lesson: Lesson | null, required: number) {
  const [index, setIndex] = useState(0);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [finished, setFinished] = useState(false);
  const total = lesson?.sentences.length ?? 0;
  // 판정 콜백은 렌더 사이에 불릴 수 있어, 최신 값을 ref로도 들고 있는다
  const countsRef = useRef(counts);
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    countsRef.current = new Map();
    setCounts(countsRef.current);
    setIndex(0);
    setFinished(false);
  }, [lesson?.id]);

  // 통과 한 번을 기록하고, 이번 통과로 필요 횟수를 막 채웠으면 true
  const recordPass = useCallback((id: string) => {
    const before = countsRef.current;
    countsRef.current = addPass(before, id);
    setCounts(countsRef.current);
    return justCleared(before, id, required);
  }, [required]);

  const next = useCallback(() => {
    if (indexRef.current < total - 1) setIndex(indexRef.current + 1);
    else setFinished(true);
  }, [total]);

  // 건너뛰기: 통과로 세지 않고 번호만 옮긴다 (사용자 결정 2026-11-16 — 뒤 문장을 먼저 보고 싶을 때).
  // 마지막 문장에서는 "모두 통과"가 되면 안 되므로 아무것도 하지 않는다
  const skip = useCallback(() => {
    if (indexRef.current < total - 1) setIndex(indexRef.current + 1);
  }, [total]);

  const cleared = useMemo(() => clearedIds(counts, required), [counts, required]);
  return { index, setIndex, counts, cleared, recordPass, finished, total, next, skip };
}

// 통과 뒤 잠깐 기다렸다 다음 문장으로. 문장이 바뀌거나, 스위치를 끄거나, 마이크를 누르거나,
// 화면을 나가면 취소한다 (다시 말해 보려는 순간 저절로 넘어가 버리지 않게)
export function useAutoAdvance(enabled: boolean, sentenceId: string | undefined, advance: () => void) {
  const timer = useRef<number | null>(null);
  const [pending, setPending] = useState(false);
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPending(false);
  }, []);

  const schedule = useCallback(() => {
    cancel();
    setPending(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setPending(false);
      advanceRef.current();
    }, AUTO_ADVANCE_MS);
  }, [cancel]);

  useEffect(() => cancel, [sentenceId, cancel]);
  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled, cancel]);

  return { pending, schedule, cancel };
}
