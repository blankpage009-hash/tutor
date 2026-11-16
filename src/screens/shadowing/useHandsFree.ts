import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentUrl } from '../../content/loader';
import type { Lesson, Sentence } from '../../content/types';
import { playAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { releaseMic } from '../../speech/audioSession';
import type { MicStream } from '../../speech/micStream';
import { createCaptureContext } from '../../speech/pcmCapture';
import { runHandsFree, type HandsFreeEnd, type HandsFreeStep } from './handsFreeLoop';
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
  lesson: Lesson | null;
  index: number;
  cleared: Set<string>;
  recordPass: (id: string) => boolean;
  next: () => void;
  attempt: ReturnType<typeof useShadowingAttempt>;
  active: MutableRefObject<boolean>; // useShadowingAttempt와 같이 보는 "이어 말하기 중" 표시
  slowRate: number;
  failFeedback: boolean;
  log: (m: string) => void;
};

function playSentence(s: Sentence, rate: number, log: (m: string) => void): Promise<void> {
  if (!s.audio) return Promise.resolve();
  return playAudio(contentUrl(s.audio), rate).catch((e) => log(`재생 실패: ${String(e)}`));
}

// 마이크를 열어 둔 채 순서를 돌린다. 끝나면(이유와 상관없이) 마이크·장치를 닫는다
async function session(
  p: HandsFreeInput, ctx: AudioContext, stopped: () => boolean, onStep: (s: HandsFreeStep | null) => void
): Promise<HandsFreeEnd | string> {
  const mic = await openVoskMic(p, ctx);
  if (typeof mic === 'string') return mic;
  try {
    if (stopped() || !p.lesson) return 'stopped';
    return await runHandsFree(loopDeps(p, mic, stopped, onStep));
  } finally {
    mic.close();
    releaseMic();
  }
}

function loopDeps(p: HandsFreeInput, mic: MicStream, stopped: () => boolean, onStep: (s: HandsFreeStep | null) => void) {
  return {
    sentences: p.lesson?.sentences ?? [],
    start: p.index,
    maxFails: MAX_FAILS,
    slowRate: p.slowRate,
    failFeedback: p.failFeedback,
    stopped,
    play: async (s: Sentence, rate: number) => {
      // 튜터가 읽는 동안 들어온 소리는 인식기에 넣지 않는다 (듣기는 재생이 끝난 뒤 시작)
      await playSentence(s, rate, p.log);
      p.log(`튜터 재생 끝 (속도 ${rate}, 그동안 마이크 최대 소리 ${mic.takePeak().toFixed(3)})`);
    },
    hear: (s: Sentence) => p.attempt.hearFor(s, mic, NO_SPEECH_MS),
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
