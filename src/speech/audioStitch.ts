import { getAudioObjectUrl } from './audioCache';

// 보관함 "듣기만"을 화면을 꺼도 이어 듣게 하려고 (사용자 요청 2026-11-21) 문장 음성들을 쉼과 함께 WAV 하나로 이어 붙인다.
// 아이폰은 화면이 꺼지면 앱 코드(타이머, 다음 파일 틀기)를 재우지만, 이미 재생 중인 소리 파일 하나는 끝까지 틀어 준다.
// 24kHz: 튜터 음성 파일과 같은 수준. 모노 16비트라 1분에 약 2.9MB
const RATE = 24000;

export type Timeline = {
  starts: number[]; // 카드 i를 화면에 보여 주기 시작하는 시각(초, 파일 기준). 첫 카드는 앞 쉼부터 보인다
  offsets: number[]; // 카드 i의 소리가 시작하는 시각
  total: number;
};

// 지금 방식과 같은 리듬: 앞 쉼 → (문장 → 쉼 → 다음 카드) …
export function buildTimeline(durations: number[], leadIn: number, gap: number): Timeline {
  const starts: number[] = [];
  const offsets: number[] = [];
  let t = leadIn;
  durations.forEach((d, i) => {
    starts.push(i === 0 ? 0 : t);
    offsets.push(t);
    t += d + gap;
  });
  return { starts, offsets, total: t };
}

// 재생 위치 → 화면에 보여 줄 카드 번호
export function cardAt(starts: number[], t: number): number {
  let i = 0;
  while (i + 1 < starts.length && starts[i + 1] <= t) i++;
  return i;
}

export function encodeWav(samples: Float32Array, rate = RATE): Blob {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([view.buffer], { type: 'audio/wav' });
}

// 반복 회차마다 같은 파일이 다시 나오므로 한 번만 풀어(디코드) 쓴다
async function decodeAll(urls: (string | null)[], cancelled: () => boolean): Promise<Float32Array[] | null> {
  // 이 상자는 소리를 내지 않고 파일을 24kHz로 풀어 주는 용도로만 쓴다
  const ctx = new OfflineAudioContext(1, 1, RATE);
  const memo = new Map<string, Promise<Float32Array>>();
  const decode = async (url: string) => {
    const ab = await (await fetch(await getAudioObjectUrl(url))).arrayBuffer();
    return (await ctx.decodeAudioData(ab)).getChannelData(0);
  };
  const out: Float32Array[] = [];
  for (const url of urls) {
    if (cancelled()) return null;
    if (!url) { out.push(new Float32Array(0)); continue; } // 음성 없는 옛 저장 문장: 쉼만 둔다
    if (!memo.has(url)) memo.set(url, decode(url));
    out.push(await memo.get(url)!);
  }
  return out;
}

export type Track = Timeline & { url: string };

// cancelled가 true가 되면(만드는 사이 멈춤을 누름) null
export async function stitchTrack(urls: (string | null)[], leadIn: number, gap: number, cancelled: () => boolean): Promise<Track | null> {
  const clips = await decodeAll(urls, cancelled);
  if (!clips || cancelled()) return null;
  const tl = buildTimeline(clips.map((c) => c.length / RATE), leadIn, gap);
  const all = new Float32Array(Math.ceil(tl.total * RATE));
  clips.forEach((c, i) => all.set(c, Math.min(Math.round(tl.offsets[i] * RATE), all.length - c.length)));
  return { ...tl, url: URL.createObjectURL(encodeWav(all)) };
}
