import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentUrl } from '../../content/loader';
import type { Sentence } from '../../content/types';
import { isPass, type Judgement } from '../../scoring/types';
import { wordMatchJudge } from '../../scoring/wordMatchJudge';
import { playAudio, preloadAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { ensureMicPermission, type MicCheck } from '../../speech/micPermission';
import { createCaptureContext } from '../../speech/pcmCapture';
import { listen, type Listening, type ListenResult } from '../../speech/recognizer';
import { startRecording, type ActiveRecording } from '../../speech/recorder';
import { speakPrimer } from '../../speech/speechPrimer';

export type AttemptStatus = 'idle' | 'listening' | 'passed' | 'failed';

export type AttemptOptions = {
  threshold: number;
  failFeedback: boolean;
  recordWhileListening: boolean; // Phase 4 진단: 인식과 녹음을 동시에 해도 되는지 아이폰에서 확인
  // Phase 4 진단: 두 번째 시도부터 마이크가 무음이 되는 원인 가리기 (아이폰 결과 6차)
  pcmFallback: boolean; // 직접 녹음(Web Audio)도 같이 돌릴지
  warmUpMic: boolean; // 말하기 전마다 마이크를 한 번 열었다 닫을지
  // iOS 27 대응(WebKit 버그 321436): 인식 직전에 음성 합성 한마디 + 인식을 중간에 끊지 않기
  ios27Fix: boolean;
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

// 기본은 마이크를 따로 열지 않는다(getUserMedia 없음). 권한은 음성 인식이 직접 묻고, 거절되면
// not-allowed 오류로 안내한다. 따로 연 마이크가 인식을 무음으로 만드는 것으로 의심돼서다 (아이폰 결과 7차)
function checkMic(openSeparately: boolean): Promise<MicCheck> {
  return openSeparately ? ensureMicPermission(true) : Promise.resolve({ ok: true });
}

const PREPARING_TEXT = '준비 중… 곧 듣기 시작해요';

// 끊지 않기로 한 인식이 끝내 안 끝날 때만 쓰는 마지막 수단. 끊으면 그 뒤 인식이 모두 먹통이 될 수 있어 길게 둔다
const NO_CUT_TIMEOUT_MS = 25000;

// 탭한 순간에(await 전에) 해야 하는 준비를 하고, 인식을 시작해도 될 때 끝나는 약속을 돌려준다
function prepare(o: AttemptOptions, wasPlaying: boolean) {
  // 같이 녹음할 때 쓸 직접 녹음 장치는 탭한 지금 만들어야 iOS가 소리를 넘겨준다
  const captureCtx = o.recordWhileListening && o.pcmFallback ? createCaptureContext() : null;
  const primed = o.ios27Fix ? speakPrimer(o.log) : null;
  o.log(`말하기 탭${wasPlaying ? ' (재생 중이었음)' : ''}`);
  const ready = (async () => {
    // 튜터 소리(특히 실패 후 느린 다시 듣기)가 나오는 중에 바로 마이크를 켜면 iOS 오디오 전환이
    // 덜 끝나 인식이 실패할 수 있어 잠깐 기다린다. 준비 말을 할 때는 그 말이 기다림을 대신한다
    if (wasPlaying && !primed) await new Promise((r) => window.setTimeout(r, 400));
    const mic = await checkMic(o.warmUpMic);
    // 준비 말이 끝나자마자 인식을 시작해야 한다 (버그 보고에서 확인된 순서)
    await primed;
    return mic;
  })();
  return { captureCtx, ready };
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
    onDebug: o.log,
    timeoutMs: o.ios27Fix ? NO_CUT_TIMEOUT_MS : undefined
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
  const preparing = useRef(false);
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
      // iOS 27 대응 중에는 인식을 끊지 않는다(끊으면 그 뒤 인식이 모두 먹통). 결과는 stale()이 버린다
      if (!optsRef.current.ios27Fix) listening.current?.stop();
      stopAudio();
    };
  }, [sentence]);

  const start = useCallback(async () => {
    const o = optsRef.current;
    // 준비 말이 나오는 1~2초 사이에 또 누르면 인식이 두 개 겹친다
    if (!sentence || preparing.current || listening.current) return;
    unlockAudio();
    const wasPlaying = stopAudio();
    const stale = () => currentId.current !== sentence.id;
    const setOutcome = (o: Outcome) => setStored({ id: sentence.id, o });
    preparing.current = true;
    const { captureCtx, ready } = prepare(o, wasPlaying);
    if (o.ios27Fix) setOutcome({ judgement: judge(sentence, []), status: 'idle', message: PREPARING_TEXT });
    const mic = await ready;
    preparing.current = false;
    if (stale() || !mic.ok) {
      captureCtx?.close().catch(() => undefined);
      if (!mic.ok && !stale()) {
        o.log(`마이크 권한: ${mic.reason}`);
        setOutcome({ judgement: judge(sentence, []), status: 'idle', message: mic.message });
      }
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

  const stop = useCallback(() => {
    if (!optsRef.current.ios27Fix) listening.current?.stop();
  }, []);

  return { outcome, myVoice, setMyVoice, start, stop, playTutor, replaying };
}
