// 마이크 소리를 앱이 직접 받아서(getUserMedia + Web Audio) 듣는 쪽에 조각 단위로 넘겨준다.
// 앱 안 음성 인식(src/speech/voskEngine.ts)의 "귀" 역할.
// iOS 27에서 아이폰 내장 음성 인식이 두 번째부터 먹통이라(WebKit 버그 321436) 이 길로 바꾼다.
// 주의: 이 모듈을 쓰는 화면에서는 내장 인식(SpeechRecognition)을 함께 부르지 않는다 — 둘이 마이크를 다툰다.

type Log = (m: string) => void;

export type MicStream = {
  sampleRate: number;
  // 소리 조각을 받을 함수를 등록한다. 돌려주는 함수를 부르면 등록 해제
  subscribe(fn: (data: Float32Array) => void): () => void;
  // 지난번 부른 뒤로 가장 컸던 소리(0~1). 무음인지 진단할 때 쓴다
  takePeak(): number;
  info(): string;
  close(): void;
};

// ctx는 사용자가 누른 순간(await 전)에 만든 것을 넘겨야 한다 — iOS는 그때 만든 것만 소리를 흘려 준다
// (src/speech/pcmCapture.ts의 createCaptureContext). ctx를 닫는 것은 부른 쪽 책임이다.
export async function openMicStream(ctx: AudioContext, log: Log = () => {}): Promise<MicStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // echoCancellation: 튜터 소리가 스피커로 나올 때 마이크가 그 소리를 덜 주워듣게
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
  });
  const track = stream.getAudioTracks()[0];
  if (track) {
    track.onmute = () => log('마이크: 무음으로 바뀜');
    track.onunmute = () => log('마이크: 무음 풀림');
    track.onended = () => log('마이크: 끊김');
  }
  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor는 오래된 방식이지만 별도 파일 없이 Safari에서 바로 동작한다 (pcmCapture와 같은 이유)
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const subs = new Set<(data: Float32Array) => void>();
  let peak = 0;
  proc.onaudioprocess = (e) => {
    const data = new Float32Array(e.inputBuffer.getChannelData(0));
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    subs.forEach((fn) => fn(data));
  };
  // 출력에 연결해야 WebKit이 onaudioprocess를 부른다. 출력 칸은 비워 두므로 스피커로 소리가 나가지 않는다
  source.connect(proc);
  proc.connect(ctx.destination);
  return {
    sampleRate: ctx.sampleRate,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    takePeak() {
      const p = peak;
      peak = 0;
      return p;
    },
    info: () => `마이크 ${track?.readyState ?? '없음'}${track?.muted ? '(무음)' : ''}, 장치 ${ctx.state} ${ctx.sampleRate}Hz`,
    close() {
      proc.onaudioprocess = null;
      source.disconnect();
      proc.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    }
  };
}
