import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { IconBookmark, IconMic, IconPlay, IconStop } from '../../components/icons/icons';
import { ResultMark } from '../../components/ResultMark';
import { WordHighlight } from '../../components/WordHighlight';
import { contentUrl } from '../../content/loader';
import type { NewLesson } from '../../content/lessonTypes';
import type { Sentence } from '../../content/types';
import { playAudio, preloadAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { useSettings } from '../../settings/SettingsProvider';
import { useKeySaved } from '../newLesson/useKeySaved';
import { useNewSpeaking } from '../newLesson/useNewSpeaking';
import { StressText } from './StressText';
import styles from './Learn.module.css';

// 핵심 문장 듣기: 미리 불러 두고, 화면을 떠나면 재생 중이던 소리를 끈다
function useListen(url: string) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    preloadAudio(url).catch(() => undefined);
    return () => { stopAudio(); };
  }, [url]);
  const listen = () => {
    // iOS: 탭 처리 안에서 기다림(await) 없이 먼저 불러야 재생이 허락된다
    unlockAudio();
    setError(null);
    playAudio(url, 1).catch((e) => setError(`재생하지 못했어요: ${String(e)}`));
  };
  return { listen, error };
}

// 설명 화면 KEY SENTENCE 카드: 강세 표시 문장 + 한글, Listen · Speak · 북마크
export function KeySentenceCard({ lesson }: { lesson: NewLesson }) {
  const sentence = lesson.keySentence;
  const { listen, error } = useListen(contentUrl(sentence.audio.normal));
  // 말하기 엔진이 먹는 문장 모양. id는 핵심 문장 전용이라 보관함 id와 겹치지 않게 접미사를 붙인다
  const target = useMemo<Sentence>(() => ({
    id: `${lesson.lessonId}-key-speak`, en: sentence.en, ko: sentence.ko, note: '', hintWords: [], vocab: [],
    variations: [], audio: sentence.audio.normal
  }), [lesson.lessonId, sentence]);
  const { settings } = useSettings();
  const speaking = useNewSpeaking(target, { threshold: settings.passThreshold, failFeedback: false, onResult: () => undefined });
  const key = useKeySaved(lesson);
  const attempt = speaking.attempt;
  const listening = attempt.outcome?.status === 'listening';

  return (
    <section className={styles.card}>
      <span className={`${styles.label} ${styles.accent}`}>Key Sentence</span>
      <p className={styles.en} lang="en">
        <StressText text={sentence.stress} source={{ id: `${lesson.lessonId}-key`, en: sentence.en, ko: sentence.ko }} />
      </p>
      <p className={styles.ko} lang="ko">{sentence.ko}</p>
      <div className={styles.buttons}>
        <Button size="sm" onClick={listen} disabled={listening}><IconPlay />Listen</Button>
        <Button size="sm" variant="primary" onClick={listening ? attempt.stop : attempt.start}
          disabled={speaking.micLocked && !listening} aria-pressed={listening}>
          {listening ? <IconStop /> : <IconMic />}Speak
        </Button>
        {/* 누를 때마다 저장 ↔ 해제 (사용자 요청 2026-11-20) */}
        <button type="button" className={styles.mark} onClick={() => { void key.toggle(); }} aria-pressed={key.saved}
          aria-label={key.saved ? '핵심 문장 저장 해제' : '핵심 문장을 보관함에 저장'}>
          <IconBookmark filled={key.saved} />
        </button>
      </div>
      <SpeakFeedback speaking={speaking} />
      {(error ?? key.error) && <p className={styles.error} lang="ko">{error ?? key.error}</p>}
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
