import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentUrl } from '../../content/loader';
import type { Sentence } from '../../content/types';
import { playAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { createMicSlot, type MicSlot } from '../../speech/micSlot';
import { createCaptureContext } from '../../speech/pcmCapture';
import { runHandsFree, type HandsFreeDeps, type HandsFreeEnd, type HandsFreeStep, type HearStatus } from './handsFreeLoop';
import { openVoskMic, type useShadowingAttempt } from './useShadowingAttempt';

// 사용자 결정(2026-11-16): 같은 문장 3번 연속 실패면 멈춤, 8초 동안 말이 없으면 멈춤
const MAX_FAILS = 3;
const NO_SPEECH_MS = 8000;

const END_TEXT: Record<HandsFreeEnd, string | null> = {
  done: null, // "모두 통과" 문구가 따로 나온다
  'too-many-fails': '3번 연속 어려웠어요. 느리게 듣기로 연습한 뒤 다시 눌러 주세요.',
  'no-speech': '말이 없어서 멈췄어요. 다시 누르면 이어서 해요.',
  error: '문제가 생겨 멈췄어요. 다시 눌러 주세요.',
  stopped: '이어 말하기를 멈췄어요.'
};

export type HandsFreeInput = {
  lesson: { sentences: Sentence[] } | null; // 드릴은 회차 목록을 문장 모양으로 바꿔 넘긴다
  index: number;
  cleared: Set<string>;
  recordPass: (id: string) => boolean;
  next: () => void;
  attempt: ReturnType<typeof useShadowingAttempt>;
  active: MutableRefObject<boolean>; // useShadowingAttempt와 같이 보는 "이어 말하기 중" 표시
  slowRate: number;
  failFeedback: boolean;
  micProcessing: boolean;
  micGain?: number; // 진단 ⑩
  // 진단 ⑨: 튜터가 읽는 동안 마이크를 닫아 둔다. 마이크가 열려 있으면 iOS가 소리를 통화 모드로 바꿔
  // 튜터 목소리에 잡음이 섞이고 음량도 따로 논다(아이폰 결과 13차, 사용자 확인 2026-11-19). 안 주면 지금처럼 열어 둠
  micOffWhilePlaying?: boolean;
  log: (m: string) => void;
} & Pick<HandsFreeDeps<Sentence>, 'shouldRead' | 'readFirst' | 'onTooManyFails'>; // 드릴용, 안 주면 기본 동작

function playSentence(s: Sentence, rate: number, log: (m: string) => void): Promise<void> {
  if (!s.audio) return Promise.resolve();
  return playAudio(contentUrl(s.audio), rate).catch((e) => log(`재생 실패: ${String(e)}`));
}

// 순서를 돌린다. 끝나면(이유와 상관없이) 마이크를 닫는다. 장치(ctx)는 부른 쪽이 닫는다
async function session(
  p: HandsFreeInput, ctx: AudioContext, stopped: () => boolean, onStep: (s: HandsFreeStep | null) => void
): Promise<HandsFreeEnd | string> {
  const slot = createMicSlot(() => openVoskMic(p, ctx), p.log);
  // ⑨ 꺼짐: 처음에 한 번 열어 끝까지 둔다. ⑨ 켬: 처음 들을 차례에 연다
  if (!p.micOffWhilePlaying) {
    const first = await slot.get();
    if (typeof first === 'string') return first;
  }
  try {
    if (stopped() || !p.lesson) return 'stopped';
    return await runHandsFree(loopDeps(p, slot, stopped, onStep));
  } finally {
    slot.release();
  }
}

// 튜터 소리를 틀기 직전에 (⑨ 켬이면) 마이크를 닫아, 통화 모드가 아닌 보통 재생으로 나오게 한다
function beforePlay(p: HandsFreeInput, slot: MicSlot): void {
  if (p.micOffWhilePlaying) slot.release();
}

async function hearWithSlot(
  p: HandsFreeInput, slot: MicSlot, s: Sentence, stopped: () => boolean, onStep: (s: HandsFreeStep | null) => void
): Promise<HearStatus> {
  // 마이크가 켜지는 데 0.6~3초 걸린다(아이폰 결과 2026-11-19). 그동안 "듣는 중"이 뜨면 너무 일찍 말해
  // 첫 단어가 잘리므로, 실제로 켜질 때까지 준비 중으로 보여 준다
  const needsOpen = !slot.current();
  if (needsOpen) onStep('preparing');
  const mic = await slot.get();
  if (typeof mic === 'string') return 'error';
  if (needsOpen) onStep('listening');
  // 마이크를 여는 사이 멈춤을 눌렀으면 듣지 않는다 (순서 쪽이 멈춤으로 처리)
  if (stopped()) return 'no-speech';
  return p.attempt.hearFor(s, mic, NO_SPEECH_MS);
}

function loopDeps(p: HandsFreeInput, slot: MicSlot, stopped: () => boolean, onStep: (s: HandsFreeStep | null) => void) {
  const { readFirst } = p;
  return {
    sentences: p.lesson?.sentences ?? [],
    start: p.index,
    maxFails: MAX_FAILS,
    slowRate: p.slowRate,
    failFeedback: p.failFeedback,
    stopped,
    shouldRead: p.shouldRead,
    readFirst: readFirst && (async (s: Sentence) => { beforePlay(p, slot); await readFirst(s); }),
    onTooManyFails: p.onTooManyFails,
    play: async (s: Sentence, rate: number) => {
      beforePlay(p, slot);
      // 튜터가 읽는 동안 들어온 소리는 인식기에 넣지 않는다 (듣기는 재생이 끝난 뒤 시작)
      await playSentence(s, rate, p.log);
      const mic = slot.current();
      p.log(`튜터 재생 끝 (속도 ${rate}, ${mic ? `그동안 마이크 최대 소리 ${mic.takePeak().toFixed(3)}` : '그동안 마이크 꺼 둠'})`);
    },
    hear: (s: Sentence) => hearWithSlot(p, slot, s, stopped, onStep),
    // 이번 통과로 필요 횟수를 막 채웠거나, 이미 끝낸 문장이면 넘어간다
    recordPass: (s: Sentence) => p.recordPass(s.id) || p.cleared.has(s.id),
    advance: () => { p.log('이어 말하기: 다음 문장'); p.next(); },
    onStep: (step: HandsFreeStep) => {
      onStep(step);
      p.attempt.setReplaying(step === 'slow');
    }
  };
}

export function useHandsFree(input: HandsFreeInput) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<HandsFreeStep | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const latest = useRef(input);
  latest.current = input;
  const stoppedRef = useRef(true);

  const stop = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    stopAudio(); // 재생 중이면 재생 약속이 바로 끝난다
    latest.current.attempt.stop(); // 듣는 중이면 듣기가 끝난다 (결과는 순서 쪽에서 버림)
  }, []);

  const start = useCallback(() => {
    const p = latest.current;
    if (!stoppedRef.current || !p.lesson) return;
    // 둘 다 탭 순간(await 전)에 해야 iOS가 재생·마이크 소리를 허락한다
    unlockAudio();
    const ctx = createCaptureContext();
    if (!ctx) return setNotice('이 기기에서는 마이크 소리를 받을 수 없어요.');
    stoppedRef.current = false;
    p.active.current = true;
    setRunning(true);
    setNotice(null);
    p.log('이어 말하기 시작');
    void session(p, ctx, () => stoppedRef.current, setStep).then((end) => {
      p.log(`이어 말하기 끝 (${end})`);
      ctx.close().catch(() => undefined);
      stoppedRef.current = true;
      latest.current.active.current = false;
      latest.current.attempt.setReplaying(false);
      setStep(null);
      setRunning(false);
      setNotice(end in END_TEXT ? END_TEXT[end as HandsFreeEnd] : end);
    });
  }, []);

  useEffect(() => stop, [stop]); // 화면을 나가면 멈춘다
  return { running, step, notice, start, stop };
}
