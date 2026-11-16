import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentUrl } from '../../content/loader';
import type { Sentence } from '../../content/types';
import { isPass, type Judgement } from '../../scoring/types';
import { wordMatchJudge } from '../../scoring/wordMatchJudge';
import { playAudio, preloadAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { ensureMicPermission } from '../../speech/micPermission';
import { createCaptureContext } from '../../speech/pcmCapture';
import { listen, type Listening, type ListenResult } from '../../speech/recognizer';
import { startRecording, type ActiveRecording } from '../../speech/recorder';

export type AttemptStatus = 'idle' | 'listening' | 'passed' | 'failed';

export type AttemptOptions = {
  threshold: number;
  failFeedback: boolean;
  recordWhileListening: boolean; // Phase 4 진단: 인식과 녹음을 동시에 해도 되는지 아이폰에서 확인
  slowRate: number;
  log: (msg: string) => void;
  // 통과 횟수 세기·자동 넘기기는 화면이 맡는다. 판정이 끝난 그 순간에만 알려 준다
  onResult?: (sentenceId: string, status: AttemptStatus) => void;
};

const judge = (s: Sentence, alts: string[]) => wordMatchJudge.judge(s.en, alts);

const ERROR_TEXT: Record<string, string> = {
  'no-speech': '아무 말도 안 들렸어요. 다시 눌러 말해 보세요.',
  'not-allowed': '음성 인식 권한이 꺼져 있어요. 설정 > Safari에서 허용해 주세요.',
  'audio-capture': '마이크를 쓸 수 없어요. 다른 앱이 마이크를 쓰고 있는지 확인해 주세요.',
  network: '음성 인식은 인터넷이 필요해요. 연결을 확인해 주세요.',
  aborted: '듣기가 멈췄어요. 다시 눌러 주세요.',
  stuck: '음성 인식이 응답하지 않아요. 다시 눌러 보고, 계속 안 되면 앱을 완전히 닫았다 다시 열어 주세요.'
};

// 녹음을 시작해 두고, 실패해도 인식은 계속되게 한다 (녹음은 부가 기능)
export function beginRecording(log: (m: string) => void, ctx?: AudioContext | null): Promise<ActiveRecording | null> {
  return (ctx === undefined ? startRecording(log) : startRecording(log, ctx)).then(
    (r) => { log('녹음 시작'); return r; },
    (e) => { log(`녹음 시작 실패: ${String(e)}`); return null; }
  );
}

export async function finishRecording(p: Promise<ActiveRecording | null> | null, log: (m: string) => void) {
  const rec = p ? await p : null;
  if (!rec) return null;
  const r = await rec.stop();
  log(`녹음 끝: ${r.blob.size}바이트 (${r.mimeType})`);
  return r.blob.size > 0 ? URL.createObjectURL(r.blob) : null;
}

type Outcome = { judgement: Judgement; status: AttemptStatus; message: string | null };

function evaluate(sentence: Sentence, res: ListenResult, threshold: number): Outcome {
  const judgement = judge(sentence, res.alternatives);
  if (!res.alternatives.length) {
    const message = ERROR_TEXT[res.error ?? ''] ?? `인식 오류 (${res.error ?? '알 수 없음'})`;
    return { judgement, status: 'idle', message };
  }
  return { judgement, status: isPass(judgement, threshold) ? 'passed' : 'failed', message: null };
}

// 인식하면서(소리가 들어오기 시작하면) 같이 녹음하고, 둘 다 끝날 때까지 기다린다
async function listenAndRecord(
  sentence: Sentence, o: AttemptOptions, captureCtx: AudioContext | null,
  setOutcome: (o: Outcome) => void, listening: MutableRefObject<Listening | null>
) {
  setOutcome({ judgement: judge(sentence, []), status: 'listening', message: null });
  let rec: Promise<ActiveRecording | null> | null = null;
  const l = listen({
    onInterim: (alts) => setOutcome({ judgement: judge(sentence, alts), status: 'listening', message: null }),
    onAudioStart: () => {
      if (o.recordWhileListening) rec = beginRecording(o.log, captureCtx);
    },
    onDebug: o.log
  });
  listening.current = l;
  const res = await l.result;
  listening.current = null;
  // 인식이 소리를 받기 전에 끝나 녹음이 시작되지 않았으면 미리 만든 장치를 닫는다
  if (!rec) captureCtx?.close().catch(() => undefined);
  // 문장이 바뀌었어도 녹음은 끝까지 마쳐야 마이크가 반납된다
  const voice = await finishRecording(rec, o.log);
  return { res, voice };
}

// 튜터 음성: 문장이 바뀌면 미리 받아 두고(탭하자마자 재생되게), 재생 함수를 돌려준다
function useTutorAudio(sentence: Sentence | null, opts: MutableRefObject<AttemptOptions>) {
  useEffect(() => {
    if (sentence?.audio) preloadAudio(contentUrl(sentence.audio)).catch(() => undefined);
  }, [sentence]);
  return useCallback((rate = 1) => {
    unlockAudio();
    if (!sentence?.audio) return Promise.resolve();
    return playAudio(contentUrl(sentence.audio), rate).catch((e) => opts.current.log(`재생 실패: ${String(e)}`));
  }, [sentence, opts]);
}

export function useShadowingAttempt(sentence: Sentence | null, opts: AttemptOptions) {
  // 결과에 문장 id를 붙여 둔다. 다음 문장으로 넘어간 직후 앞 문장의 "통과"가 새 문장 것으로 보이지 않게
  const [stored, setStored] = useState<{ id: string; o: Outcome } | null>(null);
  const outcome: Outcome | null = !sentence ? null
    : stored?.id === sentence.id ? stored.o
    : { judgement: judge(sentence, []), status: 'idle', message: null };
  const [myVoice, setMyVoice] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);
  const listening = useRef<Listening | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  // await 사이에 문장이 바뀌었는지 알아보는 용도. 바뀌었으면 앞 문장의 결과·녹음·느린 재생을 버린다
  // (듣는 중 문장을 바꾸면 느린 다시 듣기가 이전 문장을 틀던 문제)
  const currentId = useRef(sentence?.id);
  currentId.current = sentence?.id;
  const playTutor = useTutorAudio(sentence, optsRef);

  useEffect(() => {
    setMyVoice(null);
    setReplaying(false);
    return () => {
      listening.current?.stop();
      stopAudio();
    };
  }, [sentence]);

  const start = useCallback(async () => {
    unlockAudio();
    const wasPlaying = stopAudio();
    const o = optsRef.current;
    if (!sentence) return;
    const stale = () => currentId.current !== sentence.id;
    // 같이 녹음할 때 쓸 직접 녹음 장치는 탭한 지금(await 전) 만들어야 iOS가 소리를 넘겨준다
    const captureCtx = o.recordWhileListening ? createCaptureContext() : null;
    // 튜터 소리(특히 실패 후 느린 다시 듣기)가 나오는 중에 바로 마이크를 켜면 iOS 오디오 전환이
    // 덜 끝나 인식이 실패할 수 있어 잠깐 기다린다 (아이폰 시험에서 3번째 문장 인식 실패 대응)
    if (wasPlaying) await new Promise((r) => window.setTimeout(r, 400));
    const setOutcome = (o: Outcome) => setStored({ id: sentence.id, o });
    const mic = await ensureMicPermission();
    if (stale()) {
      captureCtx?.close().catch(() => undefined);
      return;
    }
    if (!mic.ok) {
      captureCtx?.close().catch(() => undefined);
      o.log(`마이크 권한: ${mic.reason}`);
      setOutcome({ judgement: judge(sentence, []), status: 'idle', message: mic.message });
      return;
    }
    const { res, voice } = await listenAndRecord(sentence, o, captureCtx, setOutcome, listening);
    if (stale()) {
      o.log('문장이 바뀌어 앞 문장 결과를 버림');
      return;
    }
    const out = evaluate(sentence, res, o.threshold);
    o.log(`판정 ${Math.round(out.judgement.ratio * 100)}% · 들린 말 "${out.judgement.heard}"${res.error ? ` · 오류 ${res.error}` : ''}`);
    setOutcome(out);
    if (voice) setMyVoice(voice);
    o.onResult?.(sentence.id, out.status);
    // 실패 피드백: 문장 전체를 느리게 다시 들려준다 (탭 없이 재생 — iOS가 허락하는지 확인 대상)
    if (out.status === 'failed' && o.failFeedback) {
      setReplaying(true);
      await playTutor(o.slowRate);
      if (!stale()) setReplaying(false);
    }
  }, [sentence, playTutor]);

  const stop = useCallback(() => listening.current?.stop(), []);

  return { outcome, myVoice, setMyVoice, start, stop, playTutor, replaying };
}
