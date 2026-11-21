import { useEffect } from 'react';
import { contentUrl } from '../../../content/loader';
import { loadDictionary, lookupEntry } from '../../../content/dictionary';
import { playAudio, stopAudio } from '../../../speech/audioPlayer';
import { normalizeWord } from '../../../wordTap';

// 카드가 나올 때 영어 단어 발음을 한 번 들려준다 (저장 창 🔊와 같은 사전 음성 파일).
// 발음 파일은 표제어 것이라, 변화형(bigger → big)이면 다른 단어 소리가 나므로 표제어와 같을 때만 재생한다.
// 소리가 없거나 막혀도(iOS 재생 허락 등) 퀴즈는 소리 없이 그대로 진행한다.
export function useWordAutoPlay(word: string): void {
  useEffect(() => {
    let cancelled = false;
    loadDictionary().then((dict) => {
      const hit = lookupEntry(dict, word);
      const audio = hit?.entry.audio;
      if (cancelled || !hit || !audio || hit.head !== normalizeWord(word)) return;
      return playAudio(contentUrl(audio), 1);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      stopAudio();
    };
  }, [word]);
}
