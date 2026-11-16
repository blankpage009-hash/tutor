import { useCallback, useRef, useState } from 'react';
import { stopAudio, unlockAudio } from '../../speech/audioPlayer';
import type { ActiveRecording } from '../../speech/recorder';
import { beginRecording, finishRecording } from './useShadowingAttempt';

// 대안: 인식과 녹음을 동시에 못 하는 경우 "내 목소리 녹음"을 따로 누르는 버튼 (승인된 대안 1번)
export function useSeparateRecording(log: (m: string) => void, onDone: (url: string) => void) {
  const [active, setActive] = useState(false);
  const pending = useRef<Promise<ActiveRecording | null> | null>(null);

  const toggle = useCallback(async () => {
    unlockAudio();
    stopAudio();
    if (!pending.current) {
      pending.current = beginRecording(log);
      setActive(true);
      return;
    }
    const p = pending.current;
    pending.current = null;
    setActive(false);
    const url = await finishRecording(p, log);
    if (url) onDone(url);
  }, [log, onDone]);

  return { active, toggle };
}
