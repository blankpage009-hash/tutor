import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { contentUrl } from '../../content/loader';
import type { KeySentence } from '../../content/lessonTypes';
import { playAudio, preloadAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import styles from './Learn.module.css';

// 느린 음성은 따로 만들지 않고 같은 파일을 0.75배로 재생한다 (PLAN Phase 5.5 결정)
const SLOW_RATE = 0.75;

type Props = { sentence: KeySentence };

// 원고의 강세 표기(MORnings work BEST)에서 두 글자 이상 대문자 덩어리만 강조한다.
// 한 글자 대문자(I, 문장 첫 글자)는 강세 표시가 아니라서 그대로 둔다
function StressText({ text }: { text: string }) {
  const parts = text.split(/([A-Z]{2,})/);
  return <>{parts.map((p, i) => (i % 2 ? <b key={i} className={styles.strong}>{p}</b> : p))}</>;
}

export function KeySentenceCard({ sentence }: Props) {
  const [error, setError] = useState<string | null>(null);
  const url = contentUrl(sentence.audio.normal);

  useEffect(() => {
    preloadAudio(url).catch(() => undefined);
    // 화면을 떠나면 재생 중이던 소리를 끈다
    return () => { stopAudio(); };
  }, [url]);

  const play = (rate: number) => {
    // iOS: 탭 처리 안에서 기다림(await) 없이 먼저 불러야 재생이 허락된다
    unlockAudio();
    setError(null);
    playAudio(contentUrl(rate === 1 ? sentence.audio.normal : sentence.audio.slow), rate)
      .catch((e) => setError(`재생하지 못했어요: ${String(e)}`));
  };

  return (
    <section className={styles.card}>
      <span className={styles.label}>핵심 문장</span>
      <p className={styles.en} lang="en">{sentence.en}</p>
      <p className={styles.ko} lang="ko">{sentence.ko}</p>
      <p className={styles.stress} lang="en"><StressText text={sentence.stress} /></p>
      <div className={styles.listen}>
        <Button onClick={() => play(1)}>듣기</Button>
        <Button onClick={() => play(SLOW_RATE)}>천천히 (0.75배)</Button>
      </div>
      {error && <p className={styles.error} lang="ko">{error}</p>}
    </section>
  );
}
