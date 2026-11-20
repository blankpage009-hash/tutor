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

// 일하는 중(busy)이면 새 일을 받지 않는다: 시간 초과로 포기한 일도 작업 스레드는 끝까지 하므로,
// 다음 차례 일이 그 뒤에 줄 서서 또 시간 초과가 나지 않게 그 차례는 Vosk로 판정한다
export function createWhisperEngine(makeWorker: () => WorkerLike): WhisperEngine {
  let worker: WorkerLike | null = null;
  let state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
  let busy = false;
  let nextId = 1;
  let log: Log = () => {};
  const waiting = new Map<number, (text: string | null) => void>();

  const onReply = (r: WhisperReply) => {
    if (r.type === 'ready') {
      state = 'ready';
      log(`Whisper 준비됨 ${(r.ms / 1000).toFixed(1)}초`);
      return;
    }
    if (r.type === 'error' && r.id === undefined) {
      state = 'failed';
      log(`Whisper 불러오기 실패: ${r.message}`);
      return;
    }
    busy = false;
    const id = r.id ?? -1;
    if (r.type === 'error') log(`Whisper 오류: ${r.message}`);
    else log(`Whisper 받아쓰기 ${(r.ms / 1000).toFixed(2)}초 "${r.text}"`);
    waiting.get(id)?.(r.type === 'result' ? cleanWhisperText(r.text) : null);
    waiting.delete(id);
  };

  return {
    preload(l) {
      if (l) log = l;
      if (state !== 'idle') return;
      state = 'loading';
      try {
        worker = makeWorker();
        worker.onmessage = (e) => onReply(e.data);
        worker.postMessage({ type: 'load' } satisfies WhisperRequest);
      } catch (err) {
        state = 'failed';
        log(`Whisper 시작 실패: ${String(err)}`);
      }
    },
    ready: () => state === 'ready' && !busy,
    transcribe: (audio, timeoutMs, l) => runOnce(audio, timeoutMs, l)
  };

  function runOnce(audio: WhisperAudio, timeoutMs: number, l?: Log): Promise<string | null> {
    if (l) log = l;
    if (state !== 'ready' || busy || !worker || !audio.chunks.length) return Promise.resolve(null);
    busy = true;
    const id = nextId++;
    const samples = downsample(mergeChunks(audio.chunks), audio.rate, WAV_RATE);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        waiting.delete(id); // busy는 그대로: 작업 스레드가 이 일을 끝내야 풀린다
        log(`Whisper 시간 초과 ${timeoutMs}ms`);
        resolve(null);
      }, timeoutMs);
      waiting.set(id, (text) => { clearTimeout(timer); resolve(text); });
      worker!.postMessage({ type: 'run', id, audio: samples } satisfies WhisperRequest, [samples.buffer]);
    });
  }
}

// 앱 전체에서 하나만 쓴다 (모델 약 77MB를 두 번 올리지 않게)
let shared: WhisperEngine | null = null;

export function whisper(): WhisperEngine {
  shared ??= createWhisperEngine(
    () => new Worker(new URL('./whisperWorker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike
  );
  return shared;
}
