import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentUrl } from '../../content/loader';
import type { DrillStep } from '../../drillPlan';
import { getBaseRate, onPlayerTime, pauseAudio, playAudio, playSource, resumeAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { cardAt, stitchTrack } from '../../speech/audioStitch';
import { clearLockScreen, setLockScreen, setLockScreenTitle } from '../../speech/mediaSession';
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

type TrackDeps = { items: DrillStep[]; start: number; stopped: () => boolean; goTo: (i: number) => void; ready: () => void };

// 화면을 꺼도 이어 듣게 (사용자 요청 2026-11-21): 남은 카드를 긴 파일 하나로 이어 붙여 한 번에 튼다.
// 아이폰은 화면이 꺼지면 타이머·"다음 파일 틀기" 코드를 재워서, 한 문장씩 트는 방식은 첫 문장 뒤에 멈춘다.
// 카드는 재생 위치를 보고 맞춘다 (화면이 꺼진 동안엔 못 바꾸고, 다시 켜면 그 자리로 건너뛴다)
async function playTrack(d: TrackDeps): Promise<void> {
  const rest = d.items.slice(d.start);
  const rate = getBaseRate();
  // 말하기 속도 설정은 파일 전체를 빠르게/느리게 하므로, 쉼을 속도만큼 늘려 체감 길이를 지금과 같게 둔다
  const urls = rest.map((st) => (st.drill.audio.normal ? contentUrl(st.drill.audio.normal) : null));
  const track = await stitchTrack(urls, (LEAD_IN_MS / 1000) * rate, (GAP_MS / 1000) * rate, d.stopped);
  if (!track) return;
  d.ready();
  let shown = 0;
  setLockScreen(rest[0].drill.en, { play: resumeAudio, pause: pauseAudio });
  const off = onPlayerTime((t) => {
    const i = cardAt(track.starts, t);
    if (i === shown) return;
    shown = i;
    d.goTo(d.start + i);
    setLockScreenTitle(rest[i].drill.en);
  });
  try {
    await playSource(track.url, 1);
  } finally {
    off();
    clearLockScreen();
    URL.revokeObjectURL(track.url);
  }
  if (!d.stopped()) d.goTo(d.items.length); // 끝까지 들었으면 끝 화면
}

// 보관함 "듣기만": 드릴 카드 화면의 ▶ 자리에 붙인다. 마이크를 쓰지 않으므로 인식 엔진을 기다리지 않는다.
// 듣기만 한 카드는 통과로 세지 않는다 (recordPass를 부르지 않음 → 활동·스트릭에 안 들어감)
// active: 말하기 쪽(useShadowingAttempt)과 같이 보는 "저절로 넘기는 중" 표시. 카드가 바뀌면 말하기 쪽이 이전 카드 소리를
// 끄는데, 켜 두지 않으면 막 시작한 다음 문장까지 끊겨 둘째 카드부터 소리 없이 넘어간다 (아이폰 결과 2026-11-21)
export function useListenLoop(plan: DrillStep[], steps: Steps, active: MutableRefObject<boolean>): HandsFreeView & { start: () => void; stop: () => void } {
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const stoppedRef = useRef(true);
  const latest = useRef({ plan, steps, active });
  latest.current = { plan, steps, active };
  const { wait, cancel } = useCancellableWait();

  const stop = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    stopAudio(); // 재생 중이면 재생 약속이 바로 끝난다
    cancel();
  }, [cancel]);

  // 이어 붙이기가 실패하면(파일을 못 받거나 못 풂) 예전처럼 한 문장씩 튼다 — 화면을 켜 둔 동안은 그대로 된다
  const oneByOne = useCallback((from: number) => {
    const { plan: items } = latest.current;
    return runListenLoop({
      items, start: from, leadInMs: LEAD_IN_MS, gapMs: GAP_MS, wait,
      stopped: () => stoppedRef.current,
      // 말하기 모드의 promptAudio는 "모두 가림" 회차를 소리 없이 두지만, 듣기만에선 모든 카드를 들려준다
      hasAudio: (st) => st.drill.audio.normal !== '',
      play: (st) => playAudio(contentUrl(st.drill.audio.normal), 1).catch(() => setNotice('소리를 못 틀었어요. 다음 문장으로 넘어가요.')),
      advance: () => latest.current.steps.next()
    });
  }, [wait]);

  const start = useCallback(() => {
    if (!stoppedRef.current) return;
    unlockAudio(); // 탭 순간(await 전)에 해야 iOS가 소리를 허락한다
    stoppedRef.current = false;
    latest.current.active.current = true;
    setRunning(true);
    setNotice('듣기 준비 중…');
    const { plan: items, steps: s } = latest.current;
    const from = s.index;
    playTrack({
      items, start: from, stopped: () => stoppedRef.current,
      goTo: (i) => latest.current.steps.goTo(i), ready: () => setNotice(null)
    }).catch(() => {
      setNotice(null);
      if (!stoppedRef.current) return oneByOne(latest.current.steps.index);
    }).finally(() => {
      stoppedRef.current = true;
      latest.current.active.current = false;
      setRunning(false);
    });
  }, [oneByOne]);

  useEffect(() => stop, [stop]); // 화면을 나가면 멈춘다
  return {
    available: true, running, step: running ? 'reading' : null, notice,
    onToggle: () => { if (stoppedRef.current) start(); else stop(); },
    start, stop
  };
}
