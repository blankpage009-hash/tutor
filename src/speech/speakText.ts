// 음성 파일이 없는 영어 문장(Gemini가 만든 대사·변형 문장)을 아이폰 내장 음성으로 읽는다. 목소리는 레슨의 튜터(Piper)와 다르다.
// 읽기가 안 되는 기기·순간이 있어서(iOS는 탭한 순간에만 허락하기도 함) 결과를 돌려주고, 부르는 쪽이 글자만 보여 주는 쪽으로 돌아간다.

import { setAudioSession } from './audioSession';

export type SpeakResult = 'spoken' | 'unavailable' | 'failed';

type Options = { rate?: number; stopped?: () => boolean };

// 읽기가 시작되는 신호가 이만큼 안 오면 허락이 안 된 것으로 보고 포기한다
const START_TIMEOUT_MS = 2000;
// 끝 신호가 안 오는 경우가 있어(speechPrimer와 같은 이유) 글자 수에 비례한 상한을 둔다
const MAX_BASE_MS = 6000;
const MAX_PER_CHAR_MS = 120;

// Safari는 말하는 중인 문장 객체가 정리(GC)되면 끝 신호를 안 보내서, 끝날 때까지 붙잡아 둔다
let current: SpeechSynthesisUtterance | null = null;

// 아이폰에서 소리가 안 날 때 원인을 화면에서 볼 수 있게 마지막 읽기 결과를 남긴다 (읽기 시작 신호가 왔는지, 목소리 개수 등)
export type SpeakInfo = { result: SpeakResult; ms: number; started: boolean; voices: number; voice: string | null };
let lastInfo: SpeakInfo | null = null;
export function getLastSpeakInfo(): SpeakInfo | null {
  return lastInfo;
}

export function isSpeakSupported(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

// 미국 영어 목소리를 고른다 (튜터 David가 미국 남성이라 남성 목소리를 먼저). 없으면 undefined — 이때는 lang만 지정해 기기가 고르게 한다
const PREFERRED = ['aaron', 'evan', 'nathan', 'daniel', 'alex', 'fred', 'tom'];

export function pickVoice(voices: Pick<SpeechSynthesisVoice, 'name' | 'lang'>[]): Pick<SpeechSynthesisVoice, 'name' | 'lang'> | undefined {
  const us = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === 'en-us');
  const pool = us.length ? us : voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const male = pool.find((v) => PREFERRED.some((n) => v.name.toLowerCase().includes(n)));
  return male ?? pool[0];
}

export function cancelSpeech(): void {
  if (!current || !isSpeakSupported()) return;
  current = null;
  speechSynthesis.cancel();
}

// 반드시 탭 처리 함수 안에서(또는 탭 직후 await 없이) 부르는 것이 가장 잘 된다.
// 끝까지 읽었거나 우리가 멈췄으면 'spoken', 시작도 못 했거나 오류면 'failed'
export function speakText(text: string, opt: Options = {}): Promise<SpeakResult> {
  if (!isSpeakSupported()) return Promise.resolve('unavailable');
  const began = performance.now();
  return new Promise<SpeakResult>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let poll: ReturnType<typeof setInterval> | undefined;
    let done = false;
    const finish = (r: SpeakResult, cancel = false) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      clearInterval(poll);
      if (current === u) current = null;
      if (cancel) speechSynthesis.cancel();
      lastInfo = { result: r, ms: Math.round(performance.now() - began), started, voices: speechSynthesis.getVoices().length, voice: u.voice?.name ?? null };
      resolve(r);
    };
    let started = false;
    u.lang = 'en-US';
    u.rate = opt.rate ?? 1;
    const voice = pickVoice(speechSynthesis.getVoices());
    if (voice) u.voice = voice as SpeechSynthesisVoice;
    u.onstart = () => { started = true; timers.forEach(clearTimeout); };
    u.onend = () => finish('spoken');
    // 우리가 멈춘 취소(canceled·interrupted)는 오류가 아니다
    u.onerror = (e) => finish(e.error === 'canceled' || e.error === 'interrupted' ? 'spoken' : 'failed');
    current = u;
    timers.push(setTimeout(() => finish('failed', true), START_TIMEOUT_MS));
    timers.push(setTimeout(() => finish('spoken', true), MAX_BASE_MS + text.length * MAX_PER_CHAR_MS));
    // 멈춤을 누르면 바로 끊는다
    if (opt.stopped) poll = setInterval(() => { if (opt.stopped?.()) finish('spoken', true); }, 100);
    // 앞에 밀린 말이 있으면 새 말이 시작되지 않아 비운다. 하지만 비울 게 없는데 cancel 직후 speak하면
    // iOS가 새 말을 삼키는 일이 있어서, 밀린 게 있을 때만 부른다
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    // 읽기 모드: 벨소리 모드(무음 스위치)여도 소리가 나게 재생 모드로 맞춘다
    setAudioSession('playback');
    speechSynthesis.speak(u);
  });
}
