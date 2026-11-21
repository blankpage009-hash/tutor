// 설정 화면 "STUDY TIME": 앱 화면이 보이는 시간 + 잠금화면에서 듣기만 하는 시간을 오늘 활동 줄에 쌓는다.
import { addStudySeconds } from './db/activity';

const TICK_MS = 30_000;
// 화면이 보이는데 타이머가 한참 못 돈 경우(PC가 잠듦 등)는 공부가 아니라서 한 번에 최대 60초만 센다
export const MAX_VISIBLE_STEP_MS = 60_000;

// 지난 구간에서 더할 초. 잠금화면 듣기 중이면 "파일이 끝날 예정 시각"까지만 센다
// (아이폰은 화면이 꺼지면 코드가 잠들어, 끝난 순간을 바로 알 수 없다)
export function creditSeconds(from: number, now: number, opts: { listenEndsAt: number | null; capMs: number | null }): number {
  let end = now;
  if (opts.listenEndsAt !== null) end = Math.min(end, opts.listenEndsAt);
  let ms = Math.max(0, end - from);
  if (opts.capMs !== null) ms = Math.min(ms, opts.capMs);
  return Math.round(ms / 1000);
}

let segStart: number | null = null; // 세고 있는 구간의 시작. null이면 안 세는 중
let listenEndsAt: number | null = null; // 듣기만 재생이 끝날 예정 시각
let hiddenListening = false; // 화면이 꺼진 채 듣기로 세는 중인지

function flush(now = Date.now()): void {
  if (segStart === null) return;
  const sec = creditSeconds(segStart, now, {
    listenEndsAt: hiddenListening ? listenEndsAt : null,
    capMs: hiddenListening ? null : MAX_VISIBLE_STEP_MS
  });
  segStart = now;
  addStudySeconds(sec, now).catch(() => undefined);
}

function onVisibility(): void {
  const now = Date.now();
  flush(now);
  if (document.visibilityState === 'visible') {
    hiddenListening = false;
    segStart = now;
  } else if (listenEndsAt !== null && listenEndsAt > now) {
    hiddenListening = true; // 잠금화면 듣기: 구간을 열어 둔 채 둔다
  } else {
    segStart = null;
  }
}

// 보관함 듣기만이 긴 파일을 틀 때 끝날 예정 시각을 알려 주고, 멈추면 null
export function setListening(endsAt: number | null): void {
  if (endsAt === null && hiddenListening) {
    flush();
    hiddenListening = false;
    segStart = null;
  }
  listenEndsAt = endsAt;
}

let started = false;

export function startStudyClock(): void {
  if (started) return;
  started = true;
  if (document.visibilityState === 'visible') segStart = Date.now();
  document.addEventListener('visibilitychange', onVisibility);
  // 앱을 위로 밀어 닫을 때는 visibilitychange가 안 올 수 있어 pagehide에서도 저장한다
  window.addEventListener('pagehide', () => { flush(); segStart = null; });
  window.addEventListener('pageshow', () => { if (document.visibilityState === 'visible' && segStart === null) segStart = Date.now(); });
  window.setInterval(() => { if (!hiddenListening) flush(); }, TICK_MS);
}
