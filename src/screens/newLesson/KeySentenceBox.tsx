import { useEffect, useState } from 'react';
import { IconPlay } from '../../components/icons/icons';
import type { KeySentence } from '../../content/lessonTypes';
import { contentUrl } from '../../content/loader';
import { playAudio, preloadAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import styles from './LessonView.module.css';

// 레슨 화면의 KEY SENTENCE 카드: 영어·한글 + 듣기 버튼 (말하기는 설명 단계에서 한다)
export function KeySentenceBox({ sentence }: { sentence: KeySentence }) {
  const url = contentUrl(sentence.audio.normal);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    preloadAudio(url).catch(() => undefined);
    // 화면을 떠나면 재생 중이던 소리를 끈다
    return () => { stopAudio(); };
  }, [url]);

  const listen = () => {
    // iOS: 탭 처리 안에서 기다림(await) 없이 먼저 불러야 재생이 허락된다
    unlockAudio();
    setError(null);
    playAudio(url, 1).catch((e) => setError(`재생하지 못했어요: ${String(e)}`));
  };

  return (
    <section className={styles.key}>
      <div className={styles.keyTop}>
        <span className={styles.label}>Key Sentence</span>
        <button type="button" className={`${styles.iconBtn} ${styles.accent}`} onClick={listen} aria-label="핵심 문장 듣기">
          <IconPlay />
        </button>
      </div>
      <p className={styles.keyEn} lang="en">{sentence.en}</p>
      <p className={styles.keyKo} lang="ko">{sentence.ko}</p>
      {error && <p className={styles.error} lang="ko">{error}</p>}
    </section>
  );
}
