import { acquireMic, releaseMic } from './audioSession';

// 브라우저 내장 음성 인식(Web Speech API)을 "한 번 듣고 끝나는" 방식으로 감싼다.
// iOS Safari에는 접두사 붙은 webkitSpeechRecognition만 있다.

type SRAlternative = { transcript: string };
type SRResult = { isFinal: boolean; length: number; [i: number]: SRAlternative };
type SREvent = { resultIndex: number; results: { length: number; [i: number]: SRResult } };
type SRErrorEvent = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudioend: (() => void) | null;
  onnomatch: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type SRConstructor = new () => SpeechRecognitionLike;

export type ListenResult = {
  alternatives: string[]; // 후보 문장들 (판정기는 가장 잘 맞는 후보를 고른다)
  error?: string; // no-speech, not-allowed, audio-capture, network, aborted 등
  // 정답 문장 단어만 허용해 다시 들은 글자 (앱 인식 secondOpinion 'always'일 때만). 판정에 섞지 않고
  // 화면 글자에만 쓴다 — 정답 단어로 끌려가서 섞으면 엉뚱한 대답도 통과해 버린다
  hinted?: string;
};

export type ListenOptions = {
  onInterim?: (alternatives: string[]) => void;
  onAudioStart?: () => void;
  // 진단 기록용: 인식기가 보낸 신호(start, audiostart, error, end, 강제 종료)를 알려준다
  onDebug?: (msg: string) => void;
  // iOS는 가끔 끝 신호(onend)를 안 보내고 멈춘다. 이 시간이 지나면 강제로 끝낸다
  timeoutMs?: number;
};

export type Listening = { stop(): void; result: Promise<ListenResult> };

function getCtor(): SRConstructor | null {
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isRecognitionSupported(): boolean {
  return getCtor() !== null;
}

// 지금까지 들린 말을 후보별로 이어 붙인다 (중간 결과 + 확정 결과)
// 후보가 1개뿐인 조각은 앞 조각의 1순위 후보에 이어 붙인다
function collect(e: SREvent): string[] {
  let out: string[] = [];
  for (let i = 0; i < e.results.length; i++) {
    const r = e.results[i];
    const prev = out;
    out = [];
    for (let k = 0; k < r.length; k++) {
      out[k] = `${prev[k] ?? prev[0] ?? ''} ${r[k].transcript}`.trim();
    }
  }
  return out.filter(Boolean);
}

// 아이폰 시험(2026-11-16)에서 녹음이 마이크를 쥔 동안 인식을 시작하면 끝 신호 없이 멈추고,
// 그 뒤로는 인식이 계속 안 되는 일이 있었다. 그래서 (1) 인식기는 한 번에 하나만 두고 새로 시작할 때
// 남은 것을 강제로 끝내며, (2) 끝 신호가 안 와도 정해진 시간이 지나면 우리 쪽에서 끝낸 것으로 친다.
let active: { forceEnd(reason: string): void } | null = null;
const STOP_GRACE_MS = 1500;

export function listen(opts: ListenOptions = {}): Listening {
  const Ctor = getCtor();
  if (!Ctor) return { stop() {}, result: Promise.resolve({ alternatives: [], error: 'unsupported' }) };
  active?.forceEnd('새 듣기 시작');
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 3;
  const session = wire(rec, opts);
  active = session;
  acquireMic();
  try {
    rec.start();
  } catch (e) {
    session.fail(String(e));
  }
  return { stop: session.stop, result: session.result };
}

function wire(rec: SpeechRecognitionLike, opts: ListenOptions) {
  const debug = (m: string) => opts.onDebug?.(`인식 ${m}`);
  let latest: string[] = [];
  let error: string | undefined;
  let ended = false;
  let finish: (r: ListenResult) => void = () => {};
  const result = new Promise<ListenResult>((resolve) => { finish = resolve; });
  const timers: number[] = [];
  const end = () => {
    if (ended) return;
    ended = true;
    timers.forEach((t) => window.clearTimeout(t));
    releaseMic();
    if (active === session) active = null;
    // 확정 결과 없이 끝나도 마지막 중간 결과로 판정한다 (iOS가 확정 신호를 빼먹는 경우 대비)
    finish({ alternatives: latest, error: latest.length ? undefined : error });
  };
  const forceEnd = (reason: string) => {
    if (ended) return;
    debug(`강제 종료 (${reason})`);
    error ??= 'stuck';
    try { rec.abort(); } catch { /* 이미 멈춘 인식기 */ }
    end();
  };
  rec.onstart = () => debug('start');
  rec.onspeechstart = () => debug('말소리 감지');
  rec.onspeechend = () => debug('말소리 끝');
  rec.onaudioend = () => debug('audioend');
  rec.onnomatch = () => debug('nomatch');
  rec.onaudiostart = () => { debug('audiostart'); opts.onAudioStart?.(); };
  rec.onresult = (e) => { latest = collect(e); opts.onInterim?.(latest); };
  rec.onerror = (e) => { error = e.error; debug(`error ${e.error}`); };
  rec.onend = () => { debug('end'); end(); };
  timers.push(window.setTimeout(() => forceEnd('시간 초과'), opts.timeoutMs ?? 15000));
  const stop = () => {
    try { rec.stop(); } catch { /* 이미 멈춘 인식기 */ }
    timers.push(window.setTimeout(() => forceEnd('멈춤 뒤 응답 없음'), STOP_GRACE_MS));
  };
  const fail = (msg: string) => { error = msg; debug(`시작 실패 ${msg}`); end(); };
  const session = { forceEnd, stop, fail, result };
  return session;
}
