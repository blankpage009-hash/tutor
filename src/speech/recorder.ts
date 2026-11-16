import { acquireMic, releaseMic } from './audioSession';

// 내 목소리 녹음. iOS 대응(Phase 0 검증):
// - start(250)처럼 조각 단위로 받아야 녹음이 0바이트가 되지 않는다
// - 녹음이 끝나면 마이크를 바로 반납한다. 쥐고 있으면 다음 인식이 실패하고 재생 소리가 작아진다

export type Recorded = { blob: Blob; mimeType: string };
export type ActiveRecording = { stop(): Promise<Recorded> };
type Log = (m: string) => void;

// 멈춤을 눌렀는데 끝 신호(onstop)가 이 시간 안에 안 오면, 모인 조각으로 끝내고 마이크를 강제로 반납한다.
// 아이폰 시험(2026-11-16)에서 녹음 뒤 "내 목소리 듣기"가 안 나오고 인식도 막혔다 → 끝 신호가 안 와서
// 마이크를 계속 쥐고 있었을 가능성에 대비한다
const STOP_GRACE_MS = 1500;

function pickMimeType(): string {
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  return types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
}

export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

async function openMic(log: Log): Promise<MediaStream> {
  acquireMic();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const t = stream.getAudioTracks()[0];
    log(`녹음 마이크 열림 (상태 ${t?.readyState}, 무음 ${t?.muted})`);
    return stream;
  } catch (e) {
    releaseMic();
    throw e;
  }
}

export async function startRecording(log: Log = () => {}): Promise<ActiveRecording> {
  const stream = await openMic(log);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  let finished = false;
  let resolveStop: (r: Recorded) => void = () => {};
  const stopped = new Promise<Recorded>((resolve) => { resolveStop = resolve; });
  const finish = (how: string) => {
    if (finished) return;
    finished = true;
    stream.getTracks().forEach((t) => t.stop());
    releaseMic();
    const type = recorder.mimeType || mimeType || 'audio/mp4';
    log(`녹음 ${how}: 조각 ${chunks.length}개`);
    resolveStop({ blob: new Blob(chunks, { type }), mimeType: type });
  };
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => finish('정상 종료');
  recorder.onerror = (e) => log(`녹음 오류: ${String((e as unknown as { error?: unknown }).error ?? e.type)}`);
  recorder.start(250);
  return {
    stop() {
      if (recorder.state !== 'inactive') {
        try { recorder.requestData(); recorder.stop(); } catch (e) { log(`녹음 멈춤 오류: ${String(e)}`); }
      }
      window.setTimeout(() => finish('강제 종료(끝 신호 없음)'), STOP_GRACE_MS);
      return stopped;
    }
  };
}
