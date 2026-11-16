// 마이크에서 직접 받은 소리 숫자들(-1~1)을 WAV 파일로 만든다.
// 왜 필요한가: 아이폰 시험(2026-11-16)에서 MediaRecorder가 마이크가 열려 있는데도 조각을 0개 넘겨줬다.
// 그래서 소리를 직접 받아 파일로 만드는 두 번째 방법을 둔다. WAV는 형식이 단순해서 iOS <audio>가 바로 재생한다.

// 말소리 듣기용이라 16kHz면 충분하다 (48kHz 그대로면 파일이 3배 커진다)
export const WAV_RATE = 16000;

// 여러 숫자를 평균 내서 표본 수를 줄인다 (예: 48000 → 16000이면 3개씩 평균)
export function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate >= inRate) return input;
  const ratio = inRate / outRate;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const from = Math.floor(i * ratio);
    const to = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let k = from; k < to; k++) sum += input[k];
    out[i] = sum / Math.max(1, to - from);
  }
  return out;
}

export function mergeChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

// 16비트 모노 PCM WAV
export function encodeWav(samples: Float32Array, rate: number): ArrayBuffer {
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
  samples.forEach((s, i) => {
    const v = Math.max(-1, Math.min(1, s));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  });
  return view.buffer;
}
