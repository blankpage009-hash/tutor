import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentUrl } from '../../content/loader';
import type { Sentence } from '../../content/types';
import { isPass, type Judgement } from '../../scoring/types';
import { wordMatchJudge } from '../../scoring/wordMatchJudge';
import { playAudio, preloadAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { ensureMicPermission } from '../../speech/micPermission';
import { listen, type Listening, type ListenResult } from '../../speech/recognizer';
import { startRecording, type ActiveRecording } from '../../speech/recorder';

export type AttemptStatus = 'idle' | 'listening' | 'passed' | 'failed';

export type AttemptOptions = {
  threshold: number;
  failFeedback: boolean;
  recordWhileListening: boolean; // Phase 4 진단: 인식과 녹음을 동시에 해도 되는지 아이폰에서 확인
  slowRate: number;
  log: (msg: string) => void;
};

const judge = (s: Sentence, alts: string[]) => wordMatchJudge.judge(s.en, alts);

const ERROR_TEXT: Record<string, string> = {
  'no-speech': '아무 말도 안 들렸어요. 다시 눌러 말해 보세요.',
  'not-allowed': '음성 인식 권한이 꺼져 있어요. 설정 > Safari에서 허용해 주세요.',
  'audio-capture': '마이크를 쓸 수 없어요. 다른 앱이 마이크를 쓰고 있는지 확인해 주세요.',
  network: '음성 인식은 인터넷이 필요해요. 연결을 확인해 주세요.',
  aborted: '듣기가 멈췄어요. 다시 눌러 주세요.'
};

// 녹음을 시작해 두고, 실패해도 인식은 계속되게 한다 (녹음은 부가 기능)
export function beginRecording(log: (m: string) => void): Promise<ActiveRecording | null> {
  return startRecording().then(
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
  const listening = useRef<Listening | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const playTutor = useTutorAudio(sentence, optsRef);

  useEffect(() => {
    setMyVoice(null);
    return () => listening.current?.stop();
  }, [sentence]);

  const start = useCallback(async () => {
    unlockAudio();
    stopAudio();
    const o = optsRef.current;
    if (!sentence) return;
    const setOutcome = (o: Outcome) => setStored({ id: sentence.id, o });
    const mic = await ensureMicPermission();
    if (!mic.ok) {
      o.log(`마이크 권한: ${mic.reason}`);
      setOutcome({ judgement: judge(sentence, []), status: 'idle', message: mic.message });
      return;
    }
    setOutcome({ judgement: judge(sentence, []), status: 'listening', message: null });
    let rec: Promise<ActiveRecording | null> | null = null;
    const l = listen({
      onInterim: (alts) => setOutcome({ judgement: judge(sentence, alts), status: 'listening', message: null }),
      onAudioStart: () => {
        o.log('인식 시작');
        if (o.recordWhileListening) rec = beginRecording(o.log);
      }
    });
    listening.current = l;
    const res = await l.result;
    listening.current = null;
    const voice = await finishRecording(rec, o.log);
    const out = evaluate(sentence, res, o.threshold);
    o.log(`판정 ${Math.round(out.judgement.ratio * 100)}% · 들린 말 "${out.judgement.heard}"${res.error ? ` · 오류 ${res.error}` : ''}`);
    setOutcome(out);
    if (voice) setMyVoice(voice);
    // 실패 피드백: 문장 전체를 느리게 다시 들려준다 (탭 없이 재생 — iOS가 허락하는지 확인 대상)
    if (out.status === 'failed' && o.failFeedback) await playTutor(o.slowRate);
  }, [sentence, playTutor]);

  const stop = useCallback(() => listening.current?.stop(), []);

  return { outcome, myVoice, setMyVoice, start, stop, playTutor };
}
