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
  start(): void;
  stop(): void;
  abort(): void;
};
type SRConstructor = new () => SpeechRecognitionLike;

export type ListenResult = {
  alternatives: string[]; // 후보 문장들 (판정기는 가장 잘 맞는 후보를 고른다)
  error?: string; // no-speech, not-allowed, audio-capture, network, aborted 등
};

export type ListenOptions = {
  onInterim?: (alternatives: string[]) => void;
  onAudioStart?: () => void;
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

export function listen(opts: ListenOptions = {}): Listening {
  const Ctor = getCtor();
  if (!Ctor) return { stop() {}, result: Promise.resolve({ alternatives: [], error: 'unsupported' }) };
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 3;
  let latest: string[] = [];
  let error: string | undefined;
  let finish: (r: ListenResult) => void = () => {};
  const result = new Promise<ListenResult>((resolve) => { finish = resolve; });
  const timer = window.setTimeout(() => rec.abort(), opts.timeoutMs ?? 15000);
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    window.clearTimeout(timer);
    releaseMic();
    // 확정 결과 없이 끝나도 마지막 중간 결과로 판정한다 (iOS가 확정 신호를 빼먹는 경우 대비)
    finish({ alternatives: latest, error: latest.length ? undefined : error });
  };
  rec.onresult = (e) => {
    latest = collect(e);
    opts.onInterim?.(latest);
  };
  rec.onerror = (e) => { error = e.error; };
  rec.onend = end;
  rec.onaudiostart = () => opts.onAudioStart?.();
  acquireMic();
  try {
    rec.start();
  } catch (e) {
    error = String(e);
    end();
  }
  return { stop: () => rec.stop(), result };
}
