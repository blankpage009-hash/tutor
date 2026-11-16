import { acquireMic, releaseMic } from './audioSession';
import { createCaptureContext, startPcmCapture, type PcmCapture, type PcmResult } from './pcmCapture';

// 내 목소리 녹음. 두 가지 방법을 같은 마이크로 동시에 돌린다:
// ① MediaRecorder (m4a, 작은 파일)  ② Web Audio 직접 받기 (WAV)
// 아이폰 시험(2026-11-16)에서 ①이 마이크가 열려 있는데도 조각을 0개 넘겨줘서 ②를 대비책으로 둔다.
// iOS 대응(Phase 0 검증): ①은 start(250)처럼 조각 단위로 받고, 끝나면 마이크를 바로 반납한다.

export type Recorded = { blob: Blob; mimeType: string };
export type ActiveRecording = { stop(): Promise<Recorded> };
type Log = (m: string) => void;

// 멈춤을 눌렀는데 끝 신호(onstop)가 이 시간 안에 안 오면, 모인 조각으로 끝내고 마이크를 강제로 반납한다
const STOP_GRACE_MS = 1500;

function pickMimeType(): string {
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  return types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
}

export function isRecordingSupported(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

async function openMic(log: Log): Promise<MediaStream> {
  acquireMic();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const t = stream.getAudioTracks()[0];
    log(`녹음 마이크 열림 (상태 ${t?.readyState}, 무음 ${t?.muted})`);
    if (t) t.onmute = () => log('녹음 마이크가 무음으로 바뀜');
    return stream;
  } catch (e) {
    releaseMic();
    throw e;
  }
}

type MediaRecResult = { blob: Blob | null; events: number; empty: number };
type MediaRec = { stop(): Promise<MediaRecResult> };

// ① MediaRecorder. 조각 이벤트 수와 0바이트 조각 수를 세어 진단에 남긴다
function startMediaRecorder(stream: MediaStream, log: Log): MediaRec | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const mimeType = pickMimeType();
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  let events = 0;
  let empty = 0;
  let resolveStop: () => void = () => {};
  const stopped = new Promise<void>((r) => { resolveStop = r; });
  rec.ondataavailable = (e) => {
    events++;
    if (e.data.size > 0) chunks.push(e.data);
    else empty++;
  };
  rec.onstop = () => resolveStop();
  rec.onerror = (e) => log(`녹음기 오류: ${String((e as unknown as { error?: unknown }).error ?? e.type)}`);
  rec.start(250);
  return {
    async stop() {
      if (rec.state !== 'inactive') {
        try { rec.requestData(); rec.stop(); } catch (e) { log(`녹음기 멈춤 오류: ${String(e)}`); }
      }
      const timedOut = await Promise.race([
        stopped.then(() => false),
        new Promise<boolean>((r) => window.setTimeout(() => r(true), STOP_GRACE_MS))
      ]);
      if (timedOut) log('녹음기 끝 신호 없음 → 강제 종료');
      const type = rec.mimeType || mimeType || 'audio/mp4';
      return { blob: chunks.length ? new Blob(chunks, { type }) : null, events, empty };
    }
  };
}

function report(m: MediaRecResult | null, p: PcmResult | null, log: Log): void {
  const a = m ? `녹음기 ${m.blob?.size ?? 0}바이트 (조각 이벤트 ${m.events}개, 빈 조각 ${m.empty}개)` : '녹음기 없음';
  const b = p
    ? `직접 녹음 ${p.wav?.size ?? 0}바이트, ${p.seconds.toFixed(1)}초, 최대 소리 ${p.peak.toFixed(3)}, 장치 ${p.state}`
    : '직접 녹음 없음';
  log(`녹음 결과: ${a} · ${b}`);
}

// ctx: 직접 녹음용 AudioContext. await 전에(탭 처리 안에서) 만들어야 iOS가 소리를 받게 해 주므로,
// 탭보다 늦게 녹음을 시작하는 경우(말하는 동안 같이 녹음)는 탭할 때 미리 만들어 넘긴다
export async function startRecording(log: Log = () => {}, ctx = createCaptureContext()): Promise<ActiveRecording> {
  log(`직접 녹음 장치: ${ctx ? ctx.state : '없음'}, ${ctx?.sampleRate ?? 0}Hz`);
  let stream: MediaStream;
  try {
    stream = await openMic(log);
  } catch (e) {
    ctx?.close().catch(() => undefined);
    throw e;
  }
  const media = startMediaRecorder(stream, log);
  let pcm: PcmCapture | null = null;
  try {
    pcm = ctx ? startPcmCapture(ctx, stream) : null;
  } catch (e) {
    log(`직접 녹음 시작 실패: ${String(e)}`);
  }
  return {
    async stop() {
      const m = media ? await media.stop() : null;
      const p = pcm ? pcm.stop() : null;
      stream.getTracks().forEach((t) => t.stop());
      releaseMic();
      report(m, p, log);
      // 녹음기 파일이 있으면 그것을(작음), 없으면 직접 녹음 WAV를 쓴다
      if (m?.blob) return { blob: m.blob, mimeType: m.blob.type };
      if (p?.wav) return { blob: p.wav, mimeType: 'audio/wav' };
      return { blob: new Blob([], { type: 'audio/mp4' }), mimeType: 'audio/mp4' };
    }
  };
}
