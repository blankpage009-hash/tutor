import { acquireMic, releaseMic } from './audioSession';

// 마이크 권한을 먼저 받아 두고 마이크는 곧바로 반납한다.
// 이유(Phase 0 아이폰 검증): 권한 확인용으로 잡은 마이크를 쥐고 있으면 음성 인식이
// audio-capture 오류를 내거나 녹음이 0바이트가 된다.
// 홈화면 앱은 앱을 다시 열 때마다 권한을 다시 물을 수 있어서, 앱을 켤 때마다 한 번씩 확인한다.

let granted = false;

export type MicCheck = { ok: true } | { ok: false; reason: 'denied' | 'unsupported' | 'error'; message: string };

// force: 이미 허락받았어도 마이크를 한 번 열었다 닫는다 ("준비 운동").
// 아이폰 시험(2026-11-16)에서 앱을 켠 뒤 첫 시도(이 열었다 닫기를 거친 시도)만 소리가 들어오고
// 두 번째 시도부터 무음이 되어, 매번 거치면 나아지는지 확인하려고 둔다
export async function ensureMicPermission(force = false): Promise<MicCheck> {
  if (granted && !force) return { ok: true };
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
