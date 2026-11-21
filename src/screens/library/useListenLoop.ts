import { useCallback, useEffect, useRef, useState } from 'react';
import { contentUrl } from '../../content/loader';
import type { DrillStep } from '../../drillPlan';
import { playAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import type { useDrillSteps } from '../drill/useDrillSteps';
import type { HandsFreeView } from '../shadowing/ShadowingStage';
import { runListenLoop } from './listenLoop';

type Steps = ReturnType<typeof useDrillSteps>;

const LEAD_IN_MS = 1000;
const GAP_MS = 1500;

// 멈춤을 누르면 쉬는 중이어도 바로 끝나는 기다림
function useCancellableWait() {
  const pending = useRef<{ timer: number; done: () => void } | null>(null);
  const wait = useCallback((ms: number) => new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => { pending.current = null; resolve(); }, ms);
    pending.current = { timer, done: resolve };
  }), []);
  const cancel = useCallback(() => {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    pending.current.done();
    pending.current = null;
  }, []);
  return { wait, cancel };
}

// 보관함 "듣기만": 드릴 카드 화면의 ▶ 자리에 붙인다. 마이크를 쓰지 않으므로 인식 엔진을 기다리지 않는다.
// 듣기만 한 카드는 통과로 세지 않는다 (recordPass를 부르지 않음 → 활동·스트릭에 안 들어감)
export function useListenLoop(plan: DrillStep[], steps: Steps): HandsFreeView & { stop: () => void } {
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const stoppedRef = useRef(true);
  const latest = useRef({ plan, steps });
  latest.current = { plan, steps };
  const { wait, cancel } = useCancellableWait();

  const stop = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    stopAudio(); // 재생 중이면 재생 약속이 바로 끝난다
    cancel();
  }, [cancel]);

  const start = useCallback(() => {
    if (!stoppedRef.current) return;
    unlockAudio(); // 탭 순간(await 전)에 해야 iOS가 소리를 허락한다
    stoppedRef.current = false;
    setRunning(true);
    setNotice(null);
    const { plan: items, steps: s } = latest.current;
    void runListenLoop({
      items, start: s.index, leadInMs: LEAD_IN_MS, gapMs: GAP_MS, wait,
      stopped: () => stoppedRef.current,
      // 말하기 모드의 promptAudio는 "모두 가림" 회차를 소리 없이 두지만, 듣기만에선 모든 카드를 들려준다
      hasAudio: (st) => st.drill.audio.normal !== '',
      play: (st) => playAudio(contentUrl(st.drill.audio.normal), 1).catch(() => setNotice('소리를 못 틀었어요. 다음 문장으로 넘어가요.')),
      advance: () => latest.current.steps.next()
    }).finally(() => {
      stoppedRef.current = true;
      setRunning(false);
    });
  }, [wait]);

  useEffect(() => stop, [stop]); // 화면을 나가면 멈춘다
  return {
    available: true, running, step: running ? 'reading' : null, notice,
    onToggle: () => { if (stoppedRef.current) start(); else stop(); },
    stop
  };
}
