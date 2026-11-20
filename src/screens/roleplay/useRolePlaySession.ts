import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Model } from 'vosk-browser';
import { contentUrl } from '../../content/loader';
import type { NewLesson, RolePlayLine } from '../../content/lessonTypes';
import { finishNewStep } from '../../db/progress';
import type { NewLessonStep } from '../../newLessonFlow';
import { judgeKeywords, type KeywordJudgement } from '../../scoring/keywordJudge';
import { judgeShown } from '../../scoring/snapHeard';
import { playAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { playFeedback } from '../../speech/feedbackSound';
import { createMicSlot, TUTOR_SAFE_MIC, type MicSlot } from '../../speech/micSlot';
import type { MicStream } from '../../speech/micStream';
import { createCaptureContext } from '../../speech/pcmCapture';
import type { Listening } from '../../speech/recognizer';
import { looseGrammarFor } from '../../speech/voskEngine';
import { listenVosk } from '../../speech/voskListener';
import { ENGINE_NOTE } from '../newLesson/useNewSpeaking';
import { openVoskMic } from '../shadowing/useShadowingAttempt';
import { useVoskModel } from '../shadowing/useVoskModel';
import { runRolePlay, type RolePlayLoopDeps, type RpHear } from './rolePlayLoop';
import { useRolePlayReplay } from './useRolePlayReplay';

// 롤플레이 연습에 필요한 것만. 레슨 STEP 4는 NewLesson을 그대로 넘기고,
// Gemini가 만든 새 상황은 levelCode가 null이라 진도를 저장하지 않는다 (가짜 레슨 줄이 생기지 않게)
export type RolePlaySource = Pick<NewLesson, 'lessonId' | 'rolePlay'> & { levelCode: string | null };

export type MyLine = Extract<RolePlayLine, { speaker: 'me' }>;
// 내 줄 화면: live = 듣는 중 들린 말, last = 마지막으로 끝난 시도(틀리면 빠진 말을 보여 주고 바로 다시 듣는다),
// preparing = 내 차례지만 마이크가 아직 켜지는 중
export type Turn = {
  live: KeywordJudgement | null; last: { pass: boolean; judgement: KeywordJudgement } | null; preparing: boolean;
};

// 통과 글자를 잠깐 보여 준 뒤 다음 상대 줄로 (대화문과 같은 간격)
const PASS_PAUSE_MS = 800;
// 키워드가 안 맞은 채 말이 끊기면 이만큼 더 기다린다 — 생각하며 쉬어도 끊기지 않게 (사용자 결정 2026-11-18)
const THINK_PAUSE_MS = 2500;
// 키워드가 다 나와도 문장을 끝까지 말하게, 말이 이만큼 멈춰야 통과로 끝낸다 (사용자 요청 2026-11-20)
const DONE_PAUSE_MS = 1500;

type Ctx = {
  model: Model; slot: MicSlot; log: (m: string) => void; stopped: () => boolean;
  listening: MutableRefObject<Listening | null>; skipping: MutableRefObject<boolean>;
  setTurn: (t: (prev: Turn) => Turn) => void; record: (no: number, text: string) => void;
};

// 상대 줄 재생 중에는 마이크가 꺼져 있어(튜터 목소리 잡음 대책, 2026-11-19) 내 차례에 연다.
// 켜지는 동안(0.6~3초)은 "준비 중"으로 보여 줘서 너무 일찍 말해 첫 단어가 잘리지 않게 한다
async function micForTurn(c: Ctx): Promise<MicStream> {
  if (!c.slot.current()) c.setTurn((t) => ({ ...t, preparing: true }));
  const mic = await c.slot.get();
  c.setTurn((t) => ({ ...t, preparing: false }));
  if (typeof mic === 'string') throw new MicOpenError(mic);
  return mic;
}

class MicOpenError extends Error {}

function takeSkip(c: Ctx, line: MyLine): boolean {
  if (!c.skipping.current) return false;
  c.skipping.current = false;
  c.record(line.no, '');
  return true;
}

// 판정 소리 (사용자 요청 2026-11-19). 마이크를 닫고 튼다 — 켜진 채면 iOS 통화 모드 잡음.
// 틀려서 다시 들을 때 마이크가 새로 켜지는 약 0.6초는 사용자가 받아들임
async function judgedSound(c: Ctx, pass: boolean): Promise<void> {
  if (c.stopped()) return;
  c.slot.release();
  await playFeedback(pass ? 'pass' : 'fail');
}

// 한 번 듣기. 중간 결과로 끝내지 않음(문장 중간에서 잘린다).
// 두 번째 의견은 늘 묻는다(화면 글자용, 판정엔 안 씀): 대답이 드릴 문장이 된 뒤(2026-11-20)
// 예시 답 단어로 다시 들으면 흐린 발음도 맞게 적힌다 (사용자 요청 2026-11-20)
async function hearLine(c: Ctx, line: MyLine): Promise<RpHear> {
  const keys = line.requiredKeywords;
  const mic = await micForTurn(c);
  // 마이크가 켜지는 사이 멈춤을 눌렀으면 듣지 않는다 (순서 쪽이 멈춤으로 처리)
  if (c.stopped()) return 'no-speech';
  // 판정 소리·마이크 여는 사이에 누른 건너뛰기 (그동안은 듣는 중이 아니라 듣기를 끊을 수 없다)
  if (takeSkip(c, line)) return 'skipped';
  c.setTurn((t) => ({ ...t, live: judgeKeywords(keys, []) }));
  const l = listenVosk({
    model: c.model, mic, sentenceEn: line.exampleEn, afterFinalMs: THINK_PAUSE_MS,
    secondOpinion: 'always', grammar: looseGrammarFor(line.exampleEn),
    afterPassMs: DONE_PAUSE_MS, isComplete: () => false,
    isPass: (alts) => judgeKeywords(keys, alts).pass,
    onInterim: (alts) => c.setTurn((t) => ({ ...t, live: judgeKeywords(keys, alts) })),
    onDebug: c.log
  });
  c.listening.current = l;
  const res = await l.result;
  c.listening.current = null;
  if (takeSkip(c, line)) return 'skipped';
  if (!res.alternatives.length) return 'no-speech';
  const judgement = judgeShown(keys, res.alternatives, res.hinted, line.exampleEn);
  c.log(`롤플레이 판정 ${judgement.pass ? '통과' : '실패'} · 들린 말 "${judgement.heard}"`);
  // 틀리면 판정 소리 동안 마이크를 닫으므로 바로 "마이크 준비 중"으로 (듣는 중으로 보이면 일찍 말해 첫 단어가 잘린다)
  c.setTurn(() => ({ live: null, last: { pass: judgement.pass, judgement }, preparing: !judgement.pass }));
  if (judgement.pass) c.record(line.no, judgement.heard);
  await judgedSound(c, judgement.pass);
  return judgement.pass ? 'passed' : 'failed';
}

// 음성 파일이 없는 상대 줄(Gemini가 만든 대사)은 글자를 읽을 시간만큼 기다린다.
// 안 기다리면 대사가 휙 지나가고 마이크가 먼저 열린다. 멈춤을 누르면 바로 끝낸다
function readingPause(text: string, stopped: () => boolean): Promise<void> {
  const until = Date.now() + Math.min(1500 + text.length * 70, 6000);
  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (!stopped() && Date.now() < until) return;
      window.clearInterval(timer);
      resolve();
    }, 100);
  });
}

function loopDeps(c: Ctx, lines: RolePlayLine[], start: number, stopped: () => boolean, onLine: (i: number) => void) {
  const deps: RolePlayLoopDeps<RolePlayLine> = {
    lines, start, stopped, onLine,
    isMine: (l) => l.speaker === 'me',
    // 상대가 말하기 전에 마이크를 닫아, 상대 목소리가 통화 모드가 아닌 보통 재생으로 나오게 한다 (드릴과 같음)
    play: (l) => {
      if (l.speaker !== 'partner') return Promise.resolve();
      c.slot.release();
      if (!l.audio) return readingPause(l.en, stopped);
      return playAudio(contentUrl(l.audio), 1).catch((e) => c.log(`재생 실패: ${String(e)}`));
    },
    hear: (l) => hearLine(c, l as MyLine),
    afterPass: () => new Promise((r) => window.setTimeout(r, PASS_PAUSE_MS))
  };
  return deps;
}

type Run = Omit<Ctx, 'slot'> & { lines: RolePlayLine[]; start: number; onLine: (i: number) => void };

// 마이크는 내 차례에 열고 상대 줄 전에 닫는다. 끝나면(이유와 상관없이) 닫는다. 실패하면 안내 문구를 돌려준다
async function session(r: Run, ctx: AudioContext) {
  const { micProcessing, micGain } = TUTOR_SAFE_MIC;
  const slot = createMicSlot(() => openVoskMic({ log: r.log, micProcessing, micGain }, ctx), r.log);
  try {
    return await runRolePlay(loopDeps({ ...r, slot }, r.lines, r.start, r.stopped, r.onLine));
  } catch (e) {
    if (e instanceof MicOpenError) return e.message;
    throw e;
  } finally {
    slot.release();
  }
}

const EMPTY_TURN: Turn = { live: null, last: null, preparing: false };

// 화면 상태: 지금 줄·내가 한 말·내 줄 결과
function useRolePlayState() {
  const [cur, setCur] = useState(0);
  const [said, setSaid] = useState<Record<number, string>>({});
  const [turn, setTurn] = useState<Turn>(EMPTY_TURN);
  const record = useCallback((no: number, text: string) => setSaid((s) => ({ ...s, [no]: text })), []);
  const onLine = useCallback((i: number) => { setCur(i); setTurn(EMPTY_TURN); }, []);
  return { cur, said, setSaid, turn, setTurn, record, onLine };
}

export type Phase = 'intro' | 'practice' | 'done';
// 롤플레이를 끝까지 간 뒤: 레슨 완료인지, 아직 안 끝낸 단계 (저장에 실패하면 null)
export type StepResult = { done: boolean; missing: NewLessonStep[] };

// 롤플레이 자동 진행: "시작" 한 번 탭하면 마이크를 켜 두고, 상대 줄 재생 → 내 차례에 저절로 듣기
// (사용자 요청 2026-11-18). iOS는 탭한 순간 만든 오디오 장치에만 마이크 소리를 주므로 시작·다시 시작은 탭으로만
export function useRolePlaySession(lesson: RolePlaySource) {
  const log = useCallback((m: string) => console.debug(`[롤플레이] ${m}`), []);
  const vosk = useVoskModel(true, log);
  const st = useRolePlayState();
  const [phase, setPhase] = useState<Phase>('intro');
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<StepResult | null>(null);
  const stoppedRef = useRef(true);
  const listening = useRef<Listening | null>(null);
  const skipping = useRef(false);
  // 지금 돌고 있는 진행(마이크를 닫는 끝 정리까지). 다시 듣기는 이것이 끝난 뒤에 소리를 낸다
  const run = useRef<Promise<void>>(Promise.resolve());

  const stop = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    stopAudio(); // 재생 중이면 재생 약속이 바로 끝난다
    listening.current?.stop();
  }, []);
  useEffect(() => stop, [stop]); // 화면을 나가면 멈춘다

  const start = useStart({
    lesson, log, model: vosk.model, st, stoppedRef, listening, skipping, run, setPhase, setRunning, setNotice, setResult
  });
  const echo = useRolePlayReplay(lesson.rolePlay.lines, stop, run, start);

  // 듣는 중이면 듣기를 끝내고 다음 줄로. 멈춰 있으면(탭이니까) 다음 줄부터 다시 시작한다
  const skip = useCallback(() => {
    if (listening.current) {
      skipping.current = true;
      listening.current.stop();
    } else if (stoppedRef.current) {
      const line = lesson.rolePlay.lines[st.cur];
      if (line) st.record(line.no, '');
      start(st.cur + 1);
    } else {
      // 진행 중인데 듣는 중이 아님(판정 소리·마이크 여는 중): 다음 듣기 직전에 건너뛴다
      skipping.current = true;
    }
  }, [lesson, st, start]);

  return {
    ...st, phase, running, notice, result, start, stop, skip, echo: echo.playing, replay: echo.replay,
    micLocked: vosk.state !== 'ready', engineNote: ENGINE_NOTE[vosk.state]
  };
}

type StartInput = {
  lesson: RolePlaySource; log: (m: string) => void; model: Model | null; st: ReturnType<typeof useRolePlayState>;
  stoppedRef: MutableRefObject<boolean>; listening: MutableRefObject<Listening | null>; skipping: MutableRefObject<boolean>;
  run: MutableRefObject<Promise<void>>;
  setPhase: (p: Phase) => void; setRunning: (b: boolean) => void; setNotice: (n: string | null) => void;
  setResult: (r: StepResult | null) => void;
};

function useStart(p: StartInput) {
  const latest = useRef(p);
  latest.current = p;
  // tapCtx: 다시 듣기처럼 탭한 순간 미리 만든 오디오 장치. 없으면 지금 만든다 (지금이 탭한 순간).
  // 시작했으면 true
  return useCallback((from: number, tapCtx?: AudioContext | null): boolean => {
    const q = latest.current;
    if (!q.stoppedRef.current) {
      tapCtx?.close().catch(() => undefined);
      return false;
    }
    unlockAudio(); // iOS: 탭한 순간 먼저
    const ctx = tapCtx === undefined ? createCaptureContext() : tapCtx;
    if (!ctx || !q.model) {
      ctx?.close().catch(() => undefined);
      q.setNotice(ctx ? '음성 인식을 준비하고 있어요. 잠시 뒤 다시 눌러 주세요.' : '이 기기에서는 마이크 소리를 받을 수 없어요.');
      return false;
    }
    q.stoppedRef.current = false;
    q.skipping.current = false;
    if (from === 0) q.st.setSaid({});
    q.setPhase('practice');
    q.setRunning(true);
    q.setNotice(null);
    const lines = q.lesson.rolePlay.lines;
    q.run.current = session({ ...q, model: q.model, setTurn: q.st.setTurn, record: q.st.record, lines, start: from,
      stopped: () => q.stoppedRef.current, onLine: q.st.onLine }, ctx).then((end) => finishRun(q, ctx, end));
    return true;
  }, []);
}

// 끝나면 마이크 장치를 닫고, 끝까지 갔으면 롤플레이 단계를 끝냄으로 저장한 뒤 끝 화면을 보여 준다.
// 네 단계를 다 끝냈을 때만 레슨 '완료' (사용자 요청 2026-11-18). 홈·레벨 목록은 진도를 화면을 열 때
// 한 번 읽어서, 저장이 끝난 뒤여야 바로 반영돼 보인다
async function finishRun(q: StartInput, ctx: AudioContext, end: string) {
  q.log(`롤플레이 끝 (${end})`);
  ctx.close().catch(() => undefined);
  q.stoppedRef.current = true;
  q.setRunning(false);
  if (end === 'done') {
    q.st.onLine(q.lesson.rolePlay.lines.length);
    const code = q.lesson.levelCode;
    const r = code ? await finishNewStep(q.lesson.lessonId, code, 'roleplay').catch(() => null) : null;
    q.setResult(r);
    q.setPhase('done');
  } else if (end !== 'stopped') {
    q.setNotice(end);
  }
}
