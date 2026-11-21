// 잠금화면·제어 센터에 지금 듣는 문장과 재생/일시정지 버튼을 보여 준다 (보관함 듣기만, 2026-11-21).
// 지원하지 않는 브라우저에서는 아무 일도 하지 않는다

type Handlers = { play: () => void; pause: () => void };

export function setLockScreen(title: string, handlers: Handlers): void {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: 'Library · Listening' });
    navigator.mediaSession.setActionHandler('play', handlers.play);
    navigator.mediaSession.setActionHandler('pause', handlers.pause);
  } catch {
    // 일부 버전은 지원하지 않는 동작에 오류를 던진다. 재생은 그대로 되므로 무시한다
  }
}

export function setLockScreenTitle(title: string): void {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.metadata) return;
  navigator.mediaSession.metadata.title = title;
}

export function clearLockScreen(): void {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.setActionHandler('play', null);
    navigator.mediaSession.setActionHandler('pause', null);
  } catch {
    // 위와 같은 이유로 무시
  }
}
