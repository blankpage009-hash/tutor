import { getAudioObjectUrl } from './audioCache';
import { setAudioSession } from './audioSession';

// 재생기를 하나만 만들어 계속 다시 쓴다. iOS는 사용자가 화면을 누른 순간에 재생한 적 있는
// <audio>만 나중에(자동 넘기기, 실패 후 다시 듣기) 코드로 재생하게 허락하기 때문.
let el: HTMLAudioElement | null = null;
let unlocked = false;
let currentEnd: (() => void) | null = null;

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

export function stopAudio(): void {
  const a = player();
  a.pause();
  currentEnd?.();
}

// 미리 받아 두면 탭했을 때 기다림 없이 바로 재생된다 (기다리는 사이 iOS가 탭의 허락을 잊는 것도 막음)
export function preloadAudio(url: string): Promise<string> {
  return getAudioObjectUrl(url);
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
  a.src = src;
  a.playbackRate = rate;
  a.defaultPlaybackRate = rate;
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      a.onended = null;
      a.onerror = null;
      currentEnd = null;
      resolve();
    };
    currentEnd = done;
    a.onended = done;
    a.onerror = () => {
      currentEnd = null;
      reject(new Error('음성 재생 오류'));
    };
    a.play().then(() => { unlocked = true; }).catch(reject);
  });
}
