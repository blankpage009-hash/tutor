import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { ResultMark } from '../../components/ResultMark';
import { WordHighlight } from '../../components/WordHighlight';
import { contentUrl } from '../../content/loader';
import type { KeySentence } from '../../content/lessonTypes';
import type { Sentence } from '../../content/types';
import { playAudio, preloadAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { useNewSpeaking } from '../newLesson/useNewSpeaking';
import styles from './Learn.module.css';

// 대화문과 같은 기준(드릴 기준 80%)
const THRESHOLD = 0.8;

type Props = { lessonId: string; sentence: KeySentence };

// 원고의 강세 표기(MORnings work BEST)에서 두 글자 이상 대문자 덩어리만 강조한다.
// 한 글자 대문자(I, 문장 첫 글자)는 강세 표시가 아니라서 그대로 둔다
function StressText({ text }: { text: string }) {
  const parts = text.split(/([A-Z]{2,})/);
  return <>{parts.map((p, i) => (i % 2 ? <b key={i} className={styles.strong}>{p}</b> : p))}</>;
}

export function KeySentenceCard({ lessonId, sentence }: Props) {
  const [error, setError] = useState<string | null>(null);
  const url = contentUrl(sentence.audio.normal);
  // 말하기 엔진이 먹는 문장 모양. id는 핵심 문장 전용이라 보관함 id와 겹치지 않게 접미사를 붙인다
  const target = useMemo<Sentence>(() => ({
    id: `${lessonId}-key-speak`, en: sentence.en, ko: sentence.ko, note: '', hintWords: [], vocab: [],
    variations: [], audio: sentence.audio.normal
  }), [lessonId, sentence]);
  const speaking = useNewSpeaking(target, { threshold: THRESHOLD, failFeedback: false, onResult: () => undefined });
  const attempt = speaking.attempt;
  const o = attempt.outcome;
  const listening = o?.status === 'listening';

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
    <section className={styles.card}>
      <p className={styles.en} lang="en">{sentence.en}</p>
      <p className={styles.ko} lang="ko">{sentence.ko}</p>
      <p className={styles.stress} lang="en"><StressText text={sentence.stress} /></p>
      <div className={styles.listen}>
        <Button onClick={listen} disabled={listening}>Listen</Button>
        <Button onClick={listening ? attempt.stop : attempt.start} disabled={speaking.micLocked && !listening}
          aria-pressed={listening}>Speak</Button>
      </div>
      <SpeakFeedback speaking={speaking} />
      {error && <p className={styles.error} lang="ko">{error}</p>}
    </section>
  );
}

// Speak 결과: 듣는 중 안내 → 단어별 표시 → 일치율. 아직 말하기 전에는 인식 준비 상태만 알린다
function SpeakFeedback({ speaking }: { speaking: ReturnType<typeof useNewSpeaking> }) {
  const o = speaking.attempt.outcome;
  if (!o || o.status === 'idle') {
    const note = o?.message ?? (speaking.micLocked ? speaking.engineNote : null);
    return note ? <p className={styles.status} lang="ko">{note}</p> : null;
  }
  const final = o.status === 'passed' || o.status === 'failed';
  const pct = Math.round(o.judgement.ratio * 100);
  return (
    <div className={styles.feedback}>
      <WordHighlight words={o.judgement.words} nextIndex={o.judgement.nextIndex} final={final} />
      {o.status === 'listening' && <p className={styles.status} lang="ko">듣는 중… 다 말하면 저절로 멈춰요</p>}
      {o.status === 'passed' && <p className={`${styles.result} ${styles.pass}`} lang="ko"><ResultMark pass />통과! 일치율 {pct}%</p>}
      {o.status === 'failed' && (
        <p className={`${styles.result} ${styles.fail}`} lang="ko">
          <ResultMark pass={false} />조금만 더! 일치율 {pct}% · 들린 말 <span lang="en">“{o.judgement.heard}”</span>
        </p>
      )}
    </div>
  );
}
