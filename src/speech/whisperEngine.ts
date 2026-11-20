import { downsample, mergeChunks, WAV_RATE } from './wav';

// 롤플레이 판정용 앱 안 받아쓰기(Whisper base.en). 계산은 작업 스레드(whisperWorker.ts)에서 한다.
// 엔진 비교(2026-11-21): 아이폰에서 작은 Vosk 79% → Whisper 92%, 약 2.3초. 정답 쪽으로 끌려가지 않아
// 판정에 써도 안전하다. 준비가 안 됐거나 늦으면 null을 돌려주고, 화면은 지금 방식(Vosk)으로 판정한다.

export type WhisperRequest = { type: 'load' } | { type: 'run'; id: number; audio: Float32Array };
export type WhisperReply =
  | { type: 'ready'; ms: number }
  | { type: 'result'; id: number; text: string; ms: number }
  | { type: 'error'; id?: number; message: string };

export type WhisperAudio = { chunks: Float32Array[]; rate: number };
type WorkerLike = Pick<Worker, 'postMessage'> & { onmessage: ((e: MessageEvent<WhisperReply>) => void) | null };
type Log = (m: string) => void;

// Whisper는 소리가 거의 없으면 "[BLANK_AUDIO]", "(music)" 같은 표시나 "You", "I" 같은 말을 지어낸다
// (PC 시험: 조용한 녹음에 "You"·"I"). 괄호 표시는 지우고, 지어낸 말은 부르는 쪽이 Vosk의 "말소리 없음"으로 거른다
export function cleanWhisperText(text: string): string {
  return text.replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*/g, ' ').replace(/\s+/g, ' ').trim();
}

export type WhisperEngine = {
  preload(log?: Log): void;
  ready(): boolean;
  transcribe(audio: WhisperAudio, timeoutMs: number, log?: Log): Promise<string | null>;
};

type Job = { audio: WhisperAudio; resolve: (text: string | null) => void; timer?: ReturnType<typeof setTimeout> };

// 작업 스레드는 한 번에 하나만 받아쓴다. 일하는 중에 온 일은 "대기 한 칸"에 둔다:
// - 시간 초과로 포기한 일도 작업 스레드는 끝까지 하므로, 새 일은 거절하지 않고 그 뒤에 바로 이어서 한다
// - 대기 칸에 이미 일이 있으면 새 일이 차지하고 옛 일은 null — 롤플레이 미리 받아쓰기에서는 가장 최근 멈춤만 의미 있다
// 시간 초과는 기다린 시간까지 합쳐 센다 (사용자 요청 2026-11-21: 미리 받아쓰기로 기다리는 시간 줄이기)
class WhisperQueue implements WhisperEngine {
  private worker: WorkerLike | null = null;
  private state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
  private running: { id: number; job: Job } | null = null;
  private pending: Job | null = null;
  private nextId = 1;
  private log: Log = () => {};

  constructor(private readonly makeWorker: () => WorkerLike) {}

  preload(l?: Log): void {
    if (l) this.log = l;
    if (this.state !== 'idle') return;
    this.state = 'loading';
    try {
      this.worker = this.makeWorker();
      this.worker.onmessage = (e) => this.onReply(e.data);
      this.worker.postMessage({ type: 'load' } satisfies WhisperRequest);
    } catch (err) {
      this.state = 'failed';
      this.log(`Whisper 시작 실패: ${String(err)}`);
    }
  }

  // 불러오기가 끝났나. 일하는 중이어도 true — 새 일은 대기 칸에서 기다린다
  ready(): boolean {
    return this.state === 'ready';
  }

  transcribe(audio: WhisperAudio, timeoutMs: number, l?: Log): Promise<string | null> {
    if (l) this.log = l;
    if (this.state !== 'ready' || !audio.chunks.length) return Promise.resolve(null);
    return new Promise((resolve) => {
      const job: Job = { audio, resolve };
      job.timer = setTimeout(() => this.giveUp(job, timeoutMs), timeoutMs);
      if (!this.running) return this.start(job);
      if (this.pending) this.drop(this.pending, '더 새 받아쓰기가 와서 대기 중이던 것을 버림');
      this.pending = job;
    });
  }

  private start(job: Job): void {
    const id = this.nextId++;
    this.running = { id, job };
    const samples = downsample(mergeChunks(job.audio.chunks), job.audio.rate, WAV_RATE);
    this.worker!.postMessage({ type: 'run', id, audio: samples } satisfies WhisperRequest, [samples.buffer]);
  }

  // 시간 초과: 기다리던 쪽에는 null. 이미 작업 스레드가 하는 중이면 끝날 때까지 running은 그대로 둔다
  private giveUp(job: Job, timeoutMs: number): void {
    this.log(`Whisper 시간 초과 ${timeoutMs}ms`);
    if (this.pending === job) this.pending = null;
    job.resolve(null);
  }

  private drop(job: Job, why: string): void {
    clearTimeout(job.timer);
    this.log(`Whisper ${why}`);
    job.resolve(null);
  }

  private onReply(r: WhisperReply): void {
    if (r.type === 'ready') {
      this.state = 'ready';
      this.log(`Whisper 준비됨 ${(r.ms / 1000).toFixed(1)}초`);
      return;
    }
    if (r.type === 'error' && r.id === undefined) {
      this.state = 'failed';
      this.log(`Whisper 불러오기 실패: ${r.message}`);
      return;
    }
    this.finish(r);
  }

  private finish(r: Extract<WhisperReply, { id?: number }>): void {
    const done = this.running;
    this.running = null;
    if (r.type === 'error') this.log(`Whisper 오류: ${r.message}`);
    else this.log(`Whisper 받아쓰기 ${(r.ms / 1000).toFixed(2)}초 "${r.text}"`);
    if (done && done.id === r.id) {
      clearTimeout(done.job.timer);
      done.job.resolve(r.type === 'result' ? cleanWhisperText(r.text) : null);
    }
    const next = this.pending;
    this.pending = null;
    if (next) this.start(next);
  }
}

export function createWhisperEngine(makeWorker: () => WorkerLike): WhisperEngine {
  return new WhisperQueue(makeWorker);
}

// 앱 전체에서 하나만 쓴다 (모델 약 77MB를 두 번 올리지 않게)
let shared: WhisperEngine | null = null;

export function whisper(): WhisperEngine {
  shared ??= createWhisperEngine(
    () => new Worker(new URL('./whisperWorker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike
  );
  return shared;
}
