import { useEffect, useState } from 'react';
import { contentUrl } from '../../content/loader';
import { playAudio, preloadAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { IconSpeaker } from '../icons/icons';
import styles from './WordSheet.module.css';

// 저장 창 발음기호 옆 🔊: 표제어 발음(scripts/audio/make_word_audio.py가 만든 파일)을 튜터 목소리로 들려준다
export function WordAudioButton({ audio, head }: { audio: string; head: string }) {
  const url = contentUrl(audio);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    // 미리 받아 두면 눌렀을 때 바로 나온다 (기다리는 사이 iOS가 탭의 재생 허락을 잊는 것도 막음)
    preloadAudio(url).catch(() => undefined);
    return () => { stopAudio(); };
  }, [url]);
  const play = () => {
    // iOS: 탭 처리 안에서 기다림(await) 없이 먼저 불러야 재생이 허락된다
    unlockAudio();
    setFailed(false);
    playAudio(url, 1).catch(() => setFailed(true));
  };
  return (
    <>
      <button type="button" className={styles.speak} onClick={play} aria-label={`${head} 발음 듣기`}>
        <IconSpeaker />
      </button>
      {failed && <span className={styles.speakError} lang="ko">재생하지 못했어요</span>}
    </>
  );
}
