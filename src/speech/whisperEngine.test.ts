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
type RunReq = Extract<WhisperRequest, { type: 'run' }>;

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

  it('시간이 넘으면 null. 다음 받아쓰기는 거절하지 않고 그 일이 끝나면 이어서 한다', async () => {
    vi.useFakeTimers();
    const { w, sent } = fakeWorker();
    const e = createWhisperEngine(() => w);
    e.preload();
    w.reply({ type: 'ready', ms: 100 });
    const p = e.transcribe(audio, 1000);
    vi.advanceTimersByTime(1000);
    expect(await p).toBeNull();
    expect(e.ready()).toBe(true);
    const next = e.transcribe(audio, 5000);
    expect(sent).toHaveLength(2); // 아직 작업 스레드는 첫 일을 하는 중이라 보내지 않는다
    w.reply({ type: 'result', id: (sent[1] as RunReq).id, text: 'late', ms: 3000 });
    expect(sent).toHaveLength(3);
    w.reply({ type: 'result', id: (sent[2] as RunReq).id, text: 'Hi there.', ms: 2000 });
    expect(await next).toBe('Hi there.');
    vi.useRealTimers();
  });

  it('대기 칸은 한 칸: 더 새 일이 오면 대기 중이던 옛 일은 null (미리 받아쓰기에서 가장 최근 멈춤만)', async () => {
    const { w, sent } = fakeWorker();
    const e = createWhisperEngine(() => w);
    e.preload();
    w.reply({ type: 'ready', ms: 100 });
    const first = e.transcribe(audio, 5000);
    const older = e.transcribe(audio, 5000);
    const newest = e.transcribe(audio, 5000);
    expect(await older).toBeNull();
    w.reply({ type: 'result', id: (sent[1] as RunReq).id, text: 'first', ms: 2000 });
    expect(await first).toBe('first');
    w.reply({ type: 'result', id: (sent[2] as RunReq).id, text: 'newest', ms: 2000 });
    expect(await newest).toBe('newest');
    expect(sent).toHaveLength(3);
  });

  it('불러오기에 실패하면 계속 준비 안 됨', () => {
    const { w } = fakeWorker();
    const e = createWhisperEngine(() => w);
    e.preload();
    w.reply({ type: 'error', message: 'out of memory' });
    expect(e.ready()).toBe(false);
  });
});
