import { acquireMic, releaseMic } from './audioSession';

// 내 목소리 녹음. iOS 대응(Phase 0 검증):
// - start(250)처럼 조각 단위로 받아야 녹음이 0바이트가 되지 않는다
// - 녹음이 끝나면 마이크를 바로 반납한다. 쥐고 있으면 다음 인식이 실패하고 재생 소리가 작아진다

export type Recorded = { blob: Blob; mimeType: string };
export type ActiveRecording = { stop(): Promise<Recorded> };

function pickMimeType(): string {
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  return types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
}

export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function startRecording(): Promise<ActiveRecording> {
  acquireMic();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    releaseMic();
    throw e;
  }
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const release = () => {
    stream.getTracks().forEach((t) => t.stop());
    releaseMic();
  };
  const stopped = new Promise<Recorded>((resolve) => {
    recorder.onstop = () => {
      release();
      const type = recorder.mimeType || mimeType || 'audio/mp4';
      resolve({ blob: new Blob(chunks, { type }), mimeType: type });
    };
  });
  recorder.start(250);
  return {
    stop() {
      if (recorder.state !== 'inactive') {
        recorder.requestData();
        recorder.stop();
      }
      return stopped;
    }
  };
}
