import { acquireMic, releaseMic } from './audioSession';

// 마이크 권한을 먼저 받아 두고 마이크는 곧바로 반납한다.
// 이유(Phase 0 아이폰 검증): 권한 확인용으로 잡은 마이크를 쥐고 있으면 음성 인식이
// audio-capture 오류를 내거나 녹음이 0바이트가 된다.
// 홈화면 앱은 앱을 다시 열 때마다 권한을 다시 물을 수 있어서, 앱을 켤 때마다 한 번씩 확인한다.

let granted = false;

export type MicCheck = { ok: true } | { ok: false; reason: 'denied' | 'unsupported' | 'error'; message: string };

export async function ensureMicPermission(): Promise<MicCheck> {
  if (granted) return { ok: true };
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'unsupported', message: '이 브라우저는 마이크를 지원하지 않아요.' };
  }
  acquireMic();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    granted = true;
    return { ok: true };
  } catch (e) {
    return failure(e);
  } finally {
    releaseMic();
  }
}

function failure(e: unknown): MicCheck {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError') {
    return { ok: false, reason: 'denied', message: '마이크 권한이 꺼져 있어요. 설정 > Safari > 마이크에서 허용해 주세요.' };
  }
  return { ok: false, reason: 'error', message: `마이크를 열 수 없어요 (${name || String(e)})` };
}
