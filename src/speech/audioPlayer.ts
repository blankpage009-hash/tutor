import { getAudioObjectUrl } from './audioCache';
import { setAudioSession } from './audioSession';

// 재생기를 하나만 만들어 계속 다시 쓴다. iOS는 사용자가 화면을 누른 순간에 재생한 적 있는
// <audio>만 나중에(자동 넘기기, 실패 후 다시 듣기) 코드로 재생하게 허락하기 때문.
let el: HTMLAudioElement | null = null;
let unlocked = false;
let currentEnd: (() => void) | null = null;
let debug: (m: string) => void = () => {};

// 진단 기록용: 재생 시작·끝·오류를 알려준다
export function setAudioDebug(fn: (m: string) => void): void {
  debug = fn;
}

// 0.1초짜리 무음 WAV. 첫 탭 때 이것을 재생해 재생기의 "허락"을 받아 둔다 (Phase 0 테스트 페이지와 같은 방식)
function silentWavUrl(): string {
  const samples = 800;
  const rate = 8000;
  const view = new DataView(new ArrayBuffer(44 + samples * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([view.buffer], { type: 'audio/wav' }));
}
let silentUrl: string | null = null;

function player(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = 'auto';
    // 느리게 재생해도 목소리가 굵어지지 않게
    el.preservesPitch = true;
  }
  return el;
}

// 반드시 탭/클릭 처리 함수 안에서 await 없이 바로 부른다
export function unlockAudio(): void {
  if (unlocked) return;
  const a = player();
  silentUrl ??= silentWavUrl();
  a.src = silentUrl;
  a.play().then(() => { unlocked = true; }).catch(() => undefined);
}

// 재생 중이었으면 true를 돌려준다 (바로 이어서 마이크를 켜도 되는지 판단용)
export function stopAudio(): boolean {
  const a = player();
  // 허락받기용 무음은 "재생 중"으로 치지 않는다
  const wasPlaying = !a.paused && !a.ended && a.src !== silentUrl;
  a.pause();
  currentEnd?.();
  if (wasPlaying) debug('재생 멈춤');
  return wasPlaying;
}

// 미리 받아 두면 탭했을 때 기다림 없이 바로 재생된다 (기다리는 사이 iOS가 탭의 허락을 잊는 것도 막음)
export function preloadAudio(url: string): Promise<string> {
  return getAudioObjectUrl(url);
}

// 설정의 말하기 속도. "보통(1)"으로 부른 재생에만 적용하고, 느린 다시 듣기(0.75)는 그대로 둔다 —
// 호출하는 곳이 많아서 한 곳(여기)에서 처리하는 편이 빠뜨릴 일이 없다
let baseRate = 1;
export function setBaseRate(rate: number): void {
  baseRate = rate;
}
export function getBaseRate(): number {
  return baseRate;
}

// 보관함 듣기만(긴 파일 하나)이 재생 위치를 보고 카드를 맞춘다. 돌려준 함수를 부르면 그만 듣는다
export function onPlayerTime(fn: (t: number) => void): () => void {
  const a = player();
  const h = () => fn(a.currentTime);
  a.addEventListener('timeupdate', h);
  return () => a.removeEventListener('timeupdate', h);
}

// 잠금화면 버튼용: stopAudio와 달리 재생 약속을 끝내지 않아서, 다시 누르면 그 자리에서 이어진다
export function pauseAudio(): void {
  player().pause();
}
export function resumeAudio(): void {
  player().play().catch(() => undefined);
}

// 콘텐츠 음성 파일 재생. 끝까지 재생되면(또는 멈추면) 끝나는 약속을 돌려준다
export async function playAudio(url: string, rate = 1): Promise<void> {
  return playSource(await getAudioObjectUrl(url), rate);
}

// 이미 blob 주소가 있는 소리(내 녹음) 재생
export function playSource(src: string, rate = 1): Promise<void> {
  stopAudio();
  setAudioSession('playback');
  const a = player();
  const effective = rate === 1 ? baseRate : rate;
  a.src = src;
  a.playbackRate = effective;
  a.defaultPlaybackRate = effective;
  debug(`재생 시작 (속도 ${effective})`);
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      if (a.ended) debug('재생 끝');
      a.onended = null;
      a.onerror = null;
      currentEnd = null;
      resolve();
    };
    currentEnd = done;
    a.onended = done;
    a.onerror = () => {
      debug(`재생 오류 (코드 ${a.error?.code ?? '?'})`);
      currentEnd = null;
      reject(new Error('음성 재생 오류'));
    };
    a.play().then(() => { unlocked = true; }).catch(reject);
  });
}
