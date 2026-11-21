import { useEffect } from 'react';
import { contentUrl } from '../../../content/loader';
import { exactAudio, loadDictionary } from '../../../content/dictionary';
import { playAudio, stopAudio } from '../../../speech/audioPlayer';

// 카드가 나올 때 영어 단어 발음을 한 번 들려준다 (저장 창 🔊와 같은 사전 음성 파일).
// 변화형(bigger)은 자기 파일이 있을 때만 재생한다 — 표제어 소리(big)로 대신하면 다른 단어가 들린다.
// 소리가 없거나 막혀도(iOS 재생 허락 등) 퀴즈는 소리 없이 그대로 진행한다.
export function useWordAutoPlay(word: string): void {
  useEffect(() => {
    let cancelled = false;
    loadDictionary().then((dict) => {
      const audio = exactAudio(dict, word);
      if (cancelled || !audio) return;
      return playAudio(contentUrl(audio), 1);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      stopAudio();
    };
  }, [word]);
}
