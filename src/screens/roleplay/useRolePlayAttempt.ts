import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Model } from 'vosk-browser';
import type { RolePlayLine } from '../../content/lessonTypes';
import { judgeKeywords, type KeywordJudgement } from '../../scoring/keywordJudge';
import { stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { releaseMic } from '../../speech/audioSession';
import { createCaptureContext } from '../../speech/pcmCapture';
import type { Listening, ListenResult } from '../../speech/recognizer';
import { listenVosk } from '../../speech/voskListener';
import { ENGINE_NOTE } from '../newLesson/useNewSpeaking';
import { openVoskMic } from '../shadowing/useShadowingAttempt';
import { useVoskModel } from '../shadowing/useVoskModel';

export type MyLine = Extract<RolePlayLine, { speaker: 'me' }>;
export type RpStatus = 'idle' | 'listening' | 'passed' | 'failed';
export type RpOutcome = { status: RpStatus; judgement: KeywordJudgement; message: string | null };

const ERROR_TEXT: Record<string, string> = {
  'no-speech': '아무 말도 안 들렸어요. 다시 눌러 말해 보세요.'
};

const idleOutcome = (line: MyLine, message: string | null = null): RpOutcome =>
  ({ status: 'idle', judgement: judgeKeywords(line.requiredKeywords, []), message });

function toOutcome(line: MyLine, res: ListenResult): RpOutcome {
  const judgement = judgeKeywords(line.requiredKeywords, res.alternatives);
  if (!res.alternatives.length) {
    return { ...idleOutcome(line), message: ERROR_TEXT[res.error ?? ''] ?? `인식 오류 (${res.error ?? '알 수 없음'})` };
  }
  return { status: judgement.pass ? 'passed' : 'failed', judgement, message: null };
}

type Run = {
  line: MyLine; model: Model; log: (m: string) => void;
  set: (o: RpOutcome) => void; listening: MutableRefObject<Listening | null>;
};

// 한 번 듣기. 자유 답변이라 쉐도잉과 설정이 다르다:
// - 두 번째 의견 끔: "예시 문장 단어만 허용" 방식이라 내 말 대신 예시 답 쪽으로 끌려간다
// - 중간 결과로 끝내지 않음: 키워드를 말한 순간 끊으면 문장 중간에서 잘린다. 말이 멈춰 확정 결과가 나올 때 판정
async function hear(r: Run, ctx: AudioContext): Promise<ListenResult | string> {
  const mic = await openVoskMic({ log: r.log, micProcessing: true }, ctx);
  if (typeof mic === 'string') return mic;
  r.set({ ...idleOutcome(r.line), status: 'listening' });
  const keys = r.line.requiredKeywords;
  const l = listenVosk({
    model: r.model, mic, sentenceEn: r.line.exampleEn, secondOpinion: false,
    isComplete: () => false,
    isPass: (alts) => judgeKeywords(keys, alts).pass,
    onInterim: (alts) => r.set({ status: 'listening', judgement: judgeKeywords(keys, alts), message: null }),
    onDebug: r.log
  });
  r.listening.current = l;
  const res = await l.result;
  r.listening.current = null;
  // 다음 상대 줄이 재생되기 전에 마이크를 돌려준다
  mic.close();
  releaseMic();
  r.log(`롤플레이 후보 ${res.alternatives.map((a) => `"${a}"`).join(', ') || '없음'}`);
  return res;
}

// 롤플레이 내 줄 말하기. attemptKey가 바뀌면(다음 내 줄·다시 하기) 앞 결과를 버린다
export function useRolePlayAttempt(line: MyLine | null, attemptKey: string, onResult: (o: RpOutcome) => void) {
  const log = useCallback((m: string) => console.debug(`[롤플레이] ${m}`), []);
  const vosk = useVoskModel(true, log);
  const [stored, setStored] = useState<{ key: string; o: RpOutcome } | null>(null);
  const listening = useRef<Listening | null>(null);
  const preparing = useRef(false);
  const keyRef = useRef(attemptKey);
  keyRef.current = attemptKey;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => () => listening.current?.stop(), [attemptKey]);

  const start = useCallback(async () => {
    if (!line || preparing.current || listening.current) return;
    unlockAudio();
    stopAudio();
    // iOS는 사용자가 누른 순간(await 전)에 만든 오디오 장치에만 마이크 소리를 흘려 준다
    const ctx = createCaptureContext();
    const key = attemptKey;
    const set = (o: RpOutcome) => { if (keyRef.current === key) setStored({ key, o }); };
    if (!ctx || !vosk.model) {
      ctx?.close().catch(() => undefined);
      set(idleOutcome(line, ctx ? '음성 인식을 준비하고 있어요. 잠시 뒤 다시 눌러 주세요.' : '이 기기에서는 마이크 소리를 받을 수 없어요.'));
      return;
    }
    preparing.current = true;
    const res = await hear({ line, model: vosk.model, log, set, listening }, ctx).finally(() => { preparing.current = false; });
    ctx.close().catch(() => undefined);
    if (keyRef.current !== key) return;
    const out = typeof res === 'string' ? idleOutcome(line, res) : toOutcome(line, res);
    set(out);
    onResultRef.current(out);
  }, [line, attemptKey, vosk.model, log]);

  const stop = useCallback(() => listening.current?.stop(), []);
  const outcome = line ? (stored?.key === attemptKey ? stored.o : idleOutcome(line)) : null;
  return { outcome, start, stop, micLocked: vosk.state !== 'ready', engineNote: ENGINE_NOTE[vosk.state] };
}
