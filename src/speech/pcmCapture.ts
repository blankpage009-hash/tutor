import { downsample, encodeWav, mergeChunks, WAV_RATE } from './wav';

// 마이크 소리를 Web Audio로 직접 받아 모으는 두 번째 녹음 방법 (MediaRecorder가 빈손일 때 대비).
// ScriptProcessor는 오래된 방식이지만 별도 파일 없이 Safari에서 바로 동작해서 쓴다.

export type PcmResult = { wav: Blob | null; peak: number; seconds: number };
export type PcmCapture = { stop(): PcmResult };

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

// iOS는 사용자가 누른 순간에 만든 AudioContext만 소리를 받게 해 준다.
// 그래서 마이크를 여는 await 전에, 탭 처리 안에서 바로 만든다
export function createCaptureContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  ctx.resume().catch(() => undefined);
  return ctx;
}

export function startPcmCapture(ctx: AudioContext, stream: MediaStream): PcmCapture {
  const source = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let peak = 0;
  proc.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  };
  // 출력에 연결해야 WebKit이 onaudioprocess를 부른다. 출력 칸은 비워 두므로 스피커로 소리가 나가지 않는다
  source.connect(proc);
  proc.connect(ctx.destination);
  return {
    stop() {
      proc.onaudioprocess = null;
      source.disconnect();
      proc.disconnect();
      ctx.close().catch(() => undefined);
      const all = mergeChunks(chunks);
      const seconds = all.length / ctx.sampleRate;
      if (!all.length) return { wav: null, peak, seconds };
      const wav = encodeWav(downsample(all, ctx.sampleRate, WAV_RATE), WAV_RATE);
      return { wav: new Blob([wav], { type: 'audio/wav' }), peak, seconds };
    }
  };
}
