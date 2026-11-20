import type { Model } from 'vosk-browser';
import type { MicStream } from './micStream';
import type { Listening, ListenResult } from './recognizer';
import { createVoskSession, grammarFor, recognizeChunks } from './voskEngine';

// 앱 안 인식 엔진(Vosk)으로 "한 문장 듣고 끝나는" 듣기. 내장 인식의 listen()과 같은 모양
// (중간 결과 → 최종 후보들 → 멈춤)이라 화면과 판정기는 그대로 쓴다.
// 판정 방법은 모른다: 언제 끝낼지는 화면이 넘겨준 isComplete/isPass로 정한다.

export type VoskListenOptions = {
  model: Model;
  mic: Pick<MicStream, 'sampleRate' | 'subscribe'>;
  sentenceEn: string;
  isComplete: (alts: string[]) => boolean; // 문장 전체를 다 말했나 (중간 결과로 바로 끝낼 때)
  isPass: (alts: string[]) => boolean; // 통과 기준을 넘었나 (확정 결과·두 번째 의견에 씀)
  // true: 통과 못 했을 때만 다시 들어 본다. 'always': 통과해도 다시 듣는다 — 롤플레이는 판정이 아니라
  // 화면에 적히는 글자를 정답 문장 쪽으로 바로잡으려고 쓴다 (사용자 요청 2026-11-20)
  secondOpinion: boolean | 'always';
  grammar?: string[]; // 두 번째 의견 단어 목록. 없으면 문장 통째(grammarFor)
  noSpeechMs?: number; // 이만큼 말이 없으면 끝낸다 (기본 12초, 이어 말하기는 8초 — 사용자 결정)
  // 확정 결과가 통과 못 했을 때 더 들어 볼 시간 (기본 AFTER_FINAL_MS). 롤플레이 자유 답변은 생각하며 쉬어서 길게
  afterFinalMs?: number;
  // 확정 결과가 통과해도 바로 끝내지 않고 이만큼 조용해야 끝낸다. 그 사이 말이 이어지면 계속 듣는다.
  // 롤플레이는 키워드만 보므로, 문장 앞부분에서 키워드가 나오자마자 끝나 버리지 않게 (사용자 요청 2026-11-20)
  afterPassMs?: number;
  onInterim?: (alts: string[]) => void;
  onDebug?: (msg: string) => void;
  // 시험에서 가짜 엔진으로 바꿔 끼우기 위한 자리
  deps?: { createSession?: typeof createVoskSession; recognize?: typeof recognizeChunks };
};

// 아이폰 결과 10차: 엔진이 말 중간의 짧은 쉼에서 확정 결과를 내 버린 일이 있어서, 확정 결과가
// 통과 못 하면 이만큼 더 듣는다. 그 사이 말이 이어지면 계속 듣는다
export const AFTER_FINAL_MS = 800;
export const NO_SPEECH_MS = 12000;
export const MAX_LISTEN_MS = 15000;
const STOP_GRACE_MS = 1000;
const SECOND_OPINION_MS = 3000;

// 엔진의 중간 결과는 "지금 말하는 토막"만 담고, 확정된 앞 토막들은 빠진다. 그래서 이어 붙인다
export function joinHeard(segments: string[], partial = ''): string {
  return [...segments, partial].filter(Boolean).join(' ');
}

// 확정 결과가 마지막 중간 결과보다 못할 때가 있어(10차 "good to [unk]") 둘 다 후보로 낸다
export function candidatesOf(segments: string[], lastHeard: string): string[] {
  return [...new Set([joinHeard(segments), lastHeard].filter(Boolean))];
}

type State = {
  o: VoskListenOptions;
  debug: (m: string) => void;
  segments: string[];
  chunks: Float32Array[];
  samples: number;
  lastHeard: string; // 지금까지 들린 말 전체 (말소리가 있었는지 보는 용도)
  lastPartial: string; // 마지막 중간 결과까지 이어 붙인 것. 확정 결과가 이보다 못할 때를 위한 후보
  ended: boolean;
  stopping: boolean;
  afterFinal?: ReturnType<typeof setTimeout>;
  end: (reason: string) => void;
};

function onPartial(s: State, t: string): void {
  if (!t || s.ended) return;
  clearTimeout(s.afterFinal);
  s.lastHeard = joinHeard(s.segments, t);
  s.lastPartial = s.lastHeard;
  s.o.onInterim?.([s.lastHeard]);
  if (s.o.isComplete([s.lastHeard])) s.end('중간 결과로 바로 통과');
}

function onFinal(s: State, t: string): void {
  if (s.ended) return;
  // 말하기 전 침묵에도 빈 확정 결과가 온다. 멈춤을 요청한 뒤에만 빈 결과로 끝낸다
  if (!t) {
    if (s.stopping) s.end('멈춤');
    return;
  }
  s.segments.push(t);
  s.debug(`확정 "${t}"`);
  s.lastHeard = joinHeard(s.segments);
  s.o.onInterim?.([s.lastHeard]);
  if (s.stopping) return s.end('확정 결과');
  const pass = s.o.isPass(candidatesOf(s.segments, s.lastPartial));
  if (pass && s.o.afterPassMs === undefined) return s.end('확정 결과');
  s.debug(pass ? '통과했지만 말이 끝날 때까지 기다리기' : '통과 못 해 조금 더 듣기');
  const wait = pass ? s.o.afterPassMs : s.o.afterFinalMs;
  s.afterFinal = setTimeout(() => s.end('확정 뒤 조용함'), wait ?? AFTER_FINAL_MS);
}

// 두 번째 의견에 다시 넣을 소리를 모은다. 너무 길어지면 더 모으지 않는다
function keep(s: State, data: Float32Array): void {
  if (s.samples >= (MAX_LISTEN_MS / 1000) * s.o.mic.sampleRate) return;
  s.chunks.push(new Float32Array(data));
  s.samples += data.length;
}

export function listenVosk(o: VoskListenOptions): Listening {
  const make = o.deps?.createSession ?? createVoskSession;
  let finish: (r: ListenResult) => void = () => {};
  const result = new Promise<ListenResult>((r) => { finish = r; });
  const timers: ReturnType<typeof setTimeout>[] = [];
  const s: State = {
    o, debug: (m) => o.onDebug?.(`앱 인식 ${m}`), segments: [], chunks: [], samples: 0,
    lastHeard: '', lastPartial: '', ended: false, stopping: false,
    end: (reason) => {
      if (s.ended) return;
      s.ended = true;
      [s.afterFinal, ...timers].forEach((t) => clearTimeout(t));
      unsubscribe();
      session.close();
      s.debug(`끝 (${reason})`);
      void conclude(o, candidatesOf(s.segments, s.lastPartial), s.chunks, s.debug).then(finish);
    }
  };
  const session = make(o.model, o.mic.sampleRate, null, {
    onPartial: (t) => onPartial(s, t),
    onFinal: (t) => onFinal(s, t),
    onError: (m) => { s.debug(`오류 ${m}`); s.end('엔진 오류'); }
  });
  const unsubscribe = o.mic.subscribe((data) => { keep(s, data); session.feed(data); });
  timers.push(setTimeout(() => { if (!s.lastHeard) s.end('말소리 없음'); }, o.noSpeechMs ?? NO_SPEECH_MS));
  timers.push(setTimeout(() => s.end('시간 초과'), MAX_LISTEN_MS));
  const stop = () => {
    if (s.ended || s.stopping) return;
    s.stopping = true;
    session.flush();
    timers.push(setTimeout(() => s.end('멈춤 뒤 응답 없음'), STOP_GRACE_MS));
  };
  return { stop, result };
}

// 끝난 뒤 후보를 정리한다. 통과 못 했으면 모아 둔 소리를 "문장 단어만 허용" 방식에 한 번 더 들려 본다
// (사용자 결정 2026-11-16: 두 방식이 서로의 실수를 메워서. 너무 후하면 진단 스위치로 끈다)
async function conclude(
  o: VoskListenOptions, cands: string[], chunks: Float32Array[], debug: (m: string) => void
): Promise<ListenResult> {
  if (!cands.length) return { alternatives: [], error: 'no-speech' };
  const skip = !o.secondOpinion || (o.secondOpinion !== 'always' && o.isPass(cands));
  if (skip || !chunks.length) return { alternatives: cands };
  const recognize = o.deps?.recognize ?? recognizeChunks;
  const began = performance.now();
  const grammar = o.grammar ?? grammarFor(o.sentenceEn);
  // 자유 인식 세션은 이미 닫았다 — 엔진 작업 스레드에서 인식기가 한 번에 하나만 돌게
  const second = await recognize(o.model, o.mic.sampleRate, grammar, chunks, SECOND_OPINION_MS);
  debug(`두 번째 의견 "${second ?? '(없음)'}" · ${Math.round(performance.now() - began)}ms`);
  return { alternatives: second && !cands.includes(second) ? [...cands, second] : cands };
}
