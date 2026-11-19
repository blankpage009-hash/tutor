import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickVoice, speakText } from './speakText';

const v = (name: string, lang: string) => ({ name, lang });

describe('pickVoice', () => {
  it('미국 영어를 먼저, 그중 남성 이름을 먼저 고른다', () => {
    const list = [v('Karen', 'en-AU'), v('Samantha', 'en-US'), v('Aaron', 'en-US'), v('Daniel', 'en-GB')];
    expect(pickVoice(list)?.name).toBe('Aaron');
  });
  it('미국 영어가 없으면 다른 영어, 영어가 없으면 undefined', () => {
    expect(pickVoice([v('Daniel', 'en-GB'), v('Yuna', 'ko-KR')])?.name).toBe('Daniel');
    expect(pickVoice([v('Yuna', 'ko-KR')])).toBeUndefined();
    expect(pickVoice([])).toBeUndefined();
  });
  it('en_US처럼 밑줄로 적힌 언어 코드도 알아본다', () => {
    expect(pickVoice([v('A', 'en_GB'), v('B', 'en_US')])?.name).toBe('B');
  });
});

// 가짜 음성 합성: speak이 불리면 behavior에 따라 신호를 보낸다
function stubSynthesis(behavior: 'ok' | 'error' | 'silent') {
  class FakeUtterance {
    text: string; lang = ''; rate = 1; voice: unknown = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    constructor(text: string) { this.text = text; }
  }
  const synth = {
    getVoices: () => [],
    cancel: vi.fn(),
    speak: (u: FakeUtterance) => {
      if (behavior === 'ok') setTimeout(() => { u.onstart?.(); u.onend?.(); }, 10);
      if (behavior === 'error') setTimeout(() => u.onerror?.({ error: 'not-allowed' }), 10);
    }
  };
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('speechSynthesis', synth);
  return synth;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('speakText', () => {
  it('음성 합성이 없으면 unavailable', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(await speakText('hi')).toBe('unavailable');
  });
  it('끝까지 읽으면 spoken', async () => {
    stubSynthesis('ok');
    expect(await speakText('hello there')).toBe('spoken');
  });
  it('허락 오류면 failed', async () => {
    stubSynthesis('error');
    expect(await speakText('hello')).toBe('failed');
  });
  it('시작 신호가 안 오면 포기하고 failed (그동안 멈춤 신호도 없음)', async () => {
    vi.useFakeTimers();
    const synth = stubSynthesis('silent');
    const p = speakText('hello');
    await vi.advanceTimersByTimeAsync(2100);
    expect(await p).toBe('failed');
    expect(synth.cancel).toHaveBeenCalled();
  });
  it('멈춤을 누르면 바로 끝낸다', async () => {
    vi.useFakeTimers();
    stubSynthesis('silent');
    let stop = false;
    const p = speakText('a long line to read', { stopped: () => stop });
    stop = true;
    await vi.advanceTimersByTimeAsync(150);
    expect(await p).toBe('spoken');
  });
});
