import { describe, expect, it, vi } from 'vitest';
import { cleanWhisperText, createWhisperEngine, type WhisperReply, type WhisperRequest } from './whisperEngine';

// 가짜 작업 스레드: 받은 요청을 모아 두고, 시험이 답을 직접 보낸다
function fakeWorker() {
  const sent: WhisperRequest[] = [];
  const w = {
    onmessage: null as ((e: MessageEvent<WhisperReply>) => void) | null,
    postMessage: (m: WhisperRequest) => { sent.push(m); },
    reply: (r: WhisperReply) => w.onmessage?.({ data: r } as MessageEvent<WhisperReply>)
  };
  return { w, sent };
}

const audio = { chunks: [new Float32Array(1600)], rate: 16000 };

describe('Whisper 받아쓰기 엔진', () => {
  it('괄호 표시([BLANK_AUDIO], (music))는 지운다', () => {
    expect(cleanWhisperText(' [BLANK_AUDIO]')).toBe('');
    expect(cleanWhisperText('(music) Hi there.')).toBe('Hi there.');
    expect(cleanWhisperText(" I'm torn between these two.")).toBe("I'm torn between these two.");
  });

  it('준비 전에는 받아쓰지 않고 null (화면은 지금 방식으로 판정)', async () => {
    const { w } = fakeWorker();
    const e = createWhisperEngine(() => w);
    expect(e.ready()).toBe(false);
    expect(await e.transcribe(audio, 1000)).toBeNull();
    e.preload();
    expect(await e.transcribe(audio, 1000)).toBeNull();
  });

  it('준비되면 받아쓴 글자를 돌려준다', async () => {
    const { w, sent } = fakeWorker();
    const e = createWhisperEngine(() => w);
    e.preload();
    expect(sent[0]).toEqual({ type: 'load' });
    w.reply({ type: 'ready', ms: 100 });
    expect(e.ready()).toBe(true);
    const p = e.transcribe(audio, 1000);
    const run = sent[1] as Extract<WhisperRequest, { type: 'run' }>;
    w.reply({ type: 'result', id: run.id, text: ' Hi there.', ms: 50 });
    expect(await p).toBe('Hi there.');
  });

  it('시간이 넘으면 null, 그 일이 끝날 때까지 다음 받아쓰기는 받지 않는다 (줄 서서 또 늦지 않게)', async () => {
    vi.useFakeTimers();
    const { w, sent } = fakeWorker();
    const e = createWhisperEngine(() => w);
    e.preload();
    w.reply({ type: 'ready', ms: 100 });
    const p = e.transcribe(audio, 1000);
    vi.advanceTimersByTime(1000);
    expect(await p).toBeNull();
    expect(e.ready()).toBe(false);
    expect(await e.transcribe(audio, 1000)).toBeNull();
    const run = sent[1] as Extract<WhisperRequest, { type: 'run' }>;
    w.reply({ type: 'result', id: run.id, text: 'late', ms: 3000 });
    expect(e.ready()).toBe(true);
    vi.useRealTimers();
  });

  it('불러오기에 실패하면 계속 준비 안 됨', () => {
    const { w } = fakeWorker();
    const e = createWhisperEngine(() => w);
    e.preload();
    w.reply({ type: 'error', message: 'out of memory' });
    expect(e.ready()).toBe(false);
  });
});
