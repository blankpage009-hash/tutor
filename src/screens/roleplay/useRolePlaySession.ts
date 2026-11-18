import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Model } from 'vosk-browser';
import { contentUrl } from '../../content/loader';
import type { NewLesson, RolePlayLine } from '../../content/lessonTypes';
import { markNewStage } from '../../db/progress';
import { judgeKeywords, type KeywordJudgement } from '../../scoring/keywordJudge';
import { playAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { releaseMic } from '../../speech/audioSession';
import type { MicStream } from '../../speech/micStream';
import { createCaptureContext } from '../../speech/pcmCapture';
import type { Listening } from '../../speech/recognizer';
import { listenVosk } from '../../speech/voskListener';
import { ENGINE_NOTE } from '../newLesson/useNewSpeaking';
import { openVoskMic } from '../shadowing/useShadowingAttempt';
import { useVoskModel } from '../shadowing/useVoskModel';
import { runRolePlay, type RolePlayLoopDeps, type RpHear } from './rolePlayLoop';

export type MyLine = Extract<RolePlayLine, { speaker: 'me' }>;
// 내 줄 화면: live = 듣는 중 들린 말, last = 마지막으로 끝난 시도(틀리면 빠진 말을 보여 주고 바로 다시 듣는다)
export type Turn = { live: KeywordJudgement | null; last: { pass: boolean; judgement: KeywordJudgement } | null };

// 통과 글자를 잠깐 보여 준 뒤 다음 상대 줄로 (대화문과 같은 간격)
const PASS_PAUSE_MS = 800;
// 키워드가 안 맞은 채 말이 끊기면 이만큼 더 기다린다 — 생각하며 쉬어도 끊기지 않게 (사용자 결정 2026-11-18)
const THINK_PAUSE_MS = 2500;

type Ctx = {
  model: Model; mic: MicStream; log: (m: string) => void;
  listening: MutableRefObject<Listening | null>; skipping: MutableRefObject<boolean>;
  setTurn: (t: (prev: Turn) => Turn) => void; record: (no: number, text: string) => void;
};

// 한 번 듣기. 두 번째 의견은 끔(예시 답 단어로 끌려간다), 중간 결과로 끝내지 않음(문장 중간에서 잘린다)
async function hearLine(c: Ctx, line: MyLine): Promise<RpHear> {
  const keys = line.requiredKeywords;
  c.setTurn((t) => ({ ...t, live: judgeKeywords(keys, []) }));
  const l = listenVosk({
    model: c.model, mic: c.mic, sentenceEn: line.exampleEn, secondOpinion: false, afterFinalMs: THINK_PAUSE_MS,
    isComplete: () => false,
    isPass: (alts) => judgeKeywords(keys, alts).pass,
    onInterim: (alts) => c.setTurn((t) => ({ ...t, live: judgeKeywords(keys, alts) })),
    onDebug: c.log
  });
  c.listening.current = l;
  const res = await l.result;
  c.listening.current = null;
  if (c.skipping.current) {
    c.skipping.current = false;
    c.record(line.no, '');
    return 'skipped';
  }
  if (!res.alternatives.length) return 'no-speech';
  const judgement = judgeKeywords(keys, res.alternatives);
  c.log(`롤플레이 판정 ${judgement.pass ? '통과' : '실패'} · 들린 말 "${judgement.heard}"`);
  c.setTurn(() => ({ live: null, last: { pass: judgement.pass, judgement } }));
  if (judgement.pass) c.record(line.no, judgement.heard);
  return judgement.pass ? 'passed' : 'failed';
}

function loopDeps(c: Ctx, lines: RolePlayLine[], start: number, stopped: () => boolean, onLine: (i: number) => void) {
  const deps: RolePlayLoopDeps<RolePlayLine> = {
    lines, start, stopped, onLine,
    isMine: (l) => l.speaker === 'me',
    // 상대가 말하는 동안 마이크는 열어 두되 인식기에는 넣지 않는다 (듣기는 재생이 끝난 뒤 시작 — 드릴과 같음)
    play: (l) => (l.speaker === 'partner'
      ? playAudio(contentUrl(l.audio), 1).catch((e) => c.log(`재생 실패: ${String(e)}`))
      : Promise.resolve()),
    hear: (l) => hearLine(c, l as MyLine),
    afterPass: () => new Promise((r) => window.setTimeout(r, PASS_PAUSE_MS))
  };
  return deps;
}

type Run = Omit<Ctx, 'mic'> & { lines: RolePlayLine[]; start: number; stopped: () => boolean; onLine: (i: number) => void };

// 마이크를 한 번 열어 끝(또는 멈춤)까지 둔다. 실패하면 안내 문구를 돌려준다
async function session(r: Run, ctx: AudioContext) {
  const mic = await openVoskMic({ log: r.log, micProcessing: true }, ctx);
  if (typeof mic === 'string') return mic;
  try {
    return await runRolePlay(loopDeps({ ...r, mic }, r.lines, r.start, r.stopped, r.onLine));
  } finally {
    mic.close();
    releaseMic();
  }
}

const EMPTY_TURN: Turn = { live: null, last: null };

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

// 롤플레이 자동 진행: "시작" 한 번 탭하면 마이크를 켜 두고, 상대 줄 재생 → 내 차례에 저절로 듣기
// (사용자 요청 2026-11-18). iOS는 탭한 순간 만든 오디오 장치에만 마이크 소리를 주므로 시작·다시 시작은 탭으로만
export function useRolePlaySession(lesson: NewLesson) {
  const log = useCallback((m: string) => console.debug(`[롤플레이] ${m}`), []);
  const vosk = useVoskModel(true, log);
  const st = useRolePlayState();
  const [phase, setPhase] = useState<Phase>('intro');
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const stoppedRef = useRef(true);
  const listening = useRef<Listening | null>(null);
  const skipping = useRef(false);

  const stop = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    stopAudio(); // 재생 중이면 재생 약속이 바로 끝난다
    listening.current?.stop();
  }, []);
  useEffect(() => stop, [stop]); // 화면을 나가면 멈춘다

  const start = useStart({ lesson, log, model: vosk.model, st, stoppedRef, listening, skipping, setPhase, setRunning, setNotice });

  // 듣는 중이면 듣기를 끝내고 다음 줄로. 멈춰 있으면(탭이니까) 다음 줄부터 다시 시작한다
  const skip = useCallback(() => {
    if (listening.current) {
      skipping.current = true;
      listening.current.stop();
    } else if (stoppedRef.current) {
      const line = lesson.rolePlay.lines[st.cur];
      if (line) st.record(line.no, '');
      start(st.cur + 1);
    }
  }, [lesson, st, start]);

  return { ...st, phase, running, notice, start, stop, skip, micLocked: vosk.state !== 'ready', engineNote: ENGINE_NOTE[vosk.state] };
}

type StartInput = {
  lesson: NewLesson; log: (m: string) => void; model: Model | null; st: ReturnType<typeof useRolePlayState>;
  stoppedRef: MutableRefObject<boolean>; listening: MutableRefObject<Listening | null>; skipping: MutableRefObject<boolean>;
  setPhase: (p: Phase) => void; setRunning: (b: boolean) => void; setNotice: (n: string | null) => void;
};

function useStart(p: StartInput) {
  const latest = useRef(p);
  latest.current = p;
  return useCallback((from: number) => {
    const q = latest.current;
    if (!q.stoppedRef.current) return;
    unlockAudio(); // iOS: 탭한 순간 먼저
    const ctx = createCaptureContext();
    if (!ctx || !q.model) {
      ctx?.close().catch(() => undefined);
      return q.setNotice(ctx ? '음성 인식을 준비하고 있어요. 잠시 뒤 다시 눌러 주세요.' : '이 기기에서는 마이크 소리를 받을 수 없어요.');
    }
    q.stoppedRef.current = false;
    q.skipping.current = false;
    if (from === 0) q.st.setSaid({});
    q.setPhase('practice');
    q.setRunning(true);
    q.setNotice(null);
    const lines = q.lesson.rolePlay.lines;
    void session({ ...q, model: q.model, setTurn: q.st.setTurn, record: q.st.record, lines, start: from,
      stopped: () => q.stoppedRef.current, onLine: q.st.onLine }, ctx).then((end) => finishRun(q, ctx, end));
  }, []);
}

// 끝나면 마이크 장치를 닫고, 끝까지 갔으면 진도를 '완료'로 저장한 뒤 완료 화면을 보여 준다
// (홈·레벨 목록은 진도를 화면을 열 때 한 번 읽어서, 저장이 끝난 뒤여야 바로 '완료'로 보인다)
async function finishRun(q: StartInput, ctx: AudioContext, end: string) {
  q.log(`롤플레이 끝 (${end})`);
  ctx.close().catch(() => undefined);
  q.stoppedRef.current = true;
  q.setRunning(false);
  if (end === 'done') {
    q.st.onLine(q.lesson.rolePlay.lines.length);
    await markNewStage(q.lesson.lessonId, q.lesson.levelCode, 'done').catch(() => undefined);
    q.setPhase('done');
  } else if (end !== 'stopped') {
    q.setNotice(end);
  }
}
