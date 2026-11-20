import type { Model } from 'vosk-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoskHandlers } from './voskEngine';
import { AFTER_FINAL_MS, candidatesOf, joinHeard, listenVosk, NO_SPEECH_MS, type VoskListenOptions } from './voskListener';

// 가짜 엔진: 시험이 직접 중간 결과·확정 결과를 보낸다
function setup(over: Partial<VoskListenOptions> = {}) {
  let h: VoskHandlers = {};
  const session = { feed: vi.fn(), flush: vi.fn(), close: vi.fn() };
  let micFn: (d: Float32Array) => void = () => {};
  const recognize = vi.fn().mockResolvedValue('good to see you again');
  const target = 'good to see you again';
  const words = (a: string[]) => Math.max(...a.map((t) => target.split(' ').filter((w) => t.split(' ').includes(w)).length));
  const l = listenVosk({
    model: {} as Model,
    mic: { sampleRate: 16000, subscribe: (fn) => { micFn = fn; return () => undefined; } },
    sentenceEn: 'Good to see you again.',
    isComplete: (a) => words(a) === 5,
    isPass: (a) => words(a) >= 4,
    secondOpinion: true,
    deps: { createSession: (_m, _r, _g, handlers) => { h = handlers; return session; }, recognize },
    ...over
  });
  return { l, h: () => h, session, recognize, sound: () => micFn(new Float32Array(160)) };
}

describe('앱 인식: 들린 말 이어 붙이기', () => {
  it('확정된 토막 뒤에 지금 토막을 붙인다', () => {
    expect(joinHeard(['good to'], 'see you')).toBe('good to see you');
    expect(joinHeard([], '')).toBe('');
  });

  it('확정 결과와 마지막 중간 결과를 둘 다 후보로 (같으면 하나)', () => {
    expect(candidatesOf(['good to [unk]'], 'good to see you again')).toEqual(['good to [unk]', 'good to see you again']);
    expect(candidatesOf(['hey'], 'hey')).toEqual(['hey']);
  });
});

describe('앱 인식: 언제 끝내나', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('중간 결과가 문장 전체와 맞으면 확정을 기다리지 않고 끝낸다', async () => {
    const t = setup();
    t.h().onPartial?.('good to see');
    t.h().onPartial?.('good to see you again');
    const r = await t.l.result;
    expect(r.alternatives).toEqual(['good to see you again']);
    expect(t.session.close).toHaveBeenCalled();
    expect(t.recognize).not.toHaveBeenCalled();
  });

  it('말하기 전 빈 확정 결과로는 끝나지 않는다', () => {
    const t = setup();
    const done = vi.fn();
    t.l.result.then(done);
    t.h().onFinal?.('');
    vi.advanceTimersByTime(AFTER_FINAL_MS * 2);
    expect(t.session.close).not.toHaveBeenCalled();
  });

  it('통과 못 한 확정 결과 뒤에도 말이 이어지면 계속 듣고 토막을 이어 붙인다', async () => {
    const t = setup({ secondOpinion: false });
    t.h().onFinal?.('good to');
    vi.advanceTimersByTime(AFTER_FINAL_MS / 2);
    t.h().onPartial?.('see you');
    vi.advanceTimersByTime(AFTER_FINAL_MS * 2);
    expect(t.session.close).not.toHaveBeenCalled();
    t.h().onFinal?.('see you');
    const r = await t.l.result;
    expect(r.alternatives).toEqual(['good to see you']);
  });

  it('통과 못 한 채 조용하면 두 번째 의견을 묻고 후보에 더한다', async () => {
    const t = setup();
    t.sound();
    t.h().onFinal?.('good the she okay');
    vi.advanceTimersByTime(AFTER_FINAL_MS);
    const r = await t.l.result;
    expect(t.recognize).toHaveBeenCalledOnce();
    expect(t.recognize.mock.calls[0][2]).toEqual(['good to see you again', '[unk]']);
    expect(r.alternatives).toEqual(['good the she okay', 'good to see you again']);
  });

  it('확정 결과가 마지막 중간 결과보다 못하면 중간 결과로 통과한다 (10차 "good to [unk]")', async () => {
    const t = setup();
    t.sound();
    t.h().onPartial?.('good to see you');
    t.h().onFinal?.('good to');
    const r = await t.l.result;
    expect(r.alternatives).toContain('good to see you');
    expect(t.recognize).not.toHaveBeenCalled();
  });

  it('afterFinalMs를 주면 통과 못 한 확정 결과 뒤에 그만큼 더 듣는다 (롤플레이: 생각하며 쉬기)', async () => {
    const t = setup({ secondOpinion: false, afterFinalMs: 2500 });
    t.h().onFinal?.('good to');
    vi.advanceTimersByTime(AFTER_FINAL_MS * 2);
    expect(t.session.close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2500);
    const r = await t.l.result;
    expect(r.alternatives).toEqual(['good to']);
  });

  it('afterPassMs를 주면 통과한 확정 결과 뒤에도 조용해질 때까지 듣는다 (롤플레이: 문장 끝까지)', async () => {
    const t = setup({ secondOpinion: false, isComplete: () => false, afterPassMs: 1500 });
    t.h().onFinal?.('good to see you');
    vi.advanceTimersByTime(1000);
    t.h().onPartial?.('again');
    vi.advanceTimersByTime(3000);
    expect(t.session.close).not.toHaveBeenCalled();
    t.h().onFinal?.('again');
    vi.advanceTimersByTime(1499);
    expect(t.session.close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    const r = await t.l.result;
    expect(r.alternatives).toEqual(['good to see you again']);
  });

  it('두 번째 의견을 끄면 묻지 않는다', async () => {
    const t = setup({ secondOpinion: false });
    t.sound();
    t.h().onFinal?.('nice to meet you');
    vi.advanceTimersByTime(AFTER_FINAL_MS);
    const r = await t.l.result;
    expect(t.recognize).not.toHaveBeenCalled();
    expect(r.alternatives).toEqual(['nice to meet you']);
  });

  it("'always'면 통과해도 두 번째 의견을 묻고, 넘겨준 단어 목록을 쓴다 (롤플레이 화면 글자 바로잡기)", async () => {
    const grammar = ['good to see you again', 'good', 'to', '[unk]'];
    const t = setup({ secondOpinion: 'always', grammar, isComplete: () => false });
    t.recognize.mockResolvedValue('good to see you again');
    t.sound();
    t.h().onFinal?.('good to sea you again');
    const r = await t.l.result;
    expect(t.recognize).toHaveBeenCalledOnce();
    expect(t.recognize.mock.calls[0][2]).toBe(grammar);
    // 판정용 후보에는 섞지 않고 따로 준다
    expect(r.alternatives).toEqual(['good to sea you again']);
    expect(r.hinted).toBe('good to see you again');
  });

  it('아무 말도 없으면 no-speech로 끝난다', async () => {
    const t = setup();
    vi.advanceTimersByTime(NO_SPEECH_MS);
    const r = await t.l.result;
    expect(r).toEqual({ alternatives: [], error: 'no-speech' });
  });

  it('멈추면 확정 결과를 달라고 하고 그 결과로 끝낸다', async () => {
    const t = setup({ secondOpinion: false });
    t.h().onPartial?.('good to');
    t.l.stop();
    expect(t.session.flush).toHaveBeenCalled();
    t.h().onFinal?.('good to');
    const r = await t.l.result;
    expect(r.alternatives).toEqual(['good to']);
  });
});
