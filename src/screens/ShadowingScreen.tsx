import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TwoColumn } from '../components/TwoColumn';
import { loadLesson } from '../content/loader';
import type { Lesson } from '../content/types';
import { DEFAULT_SETTINGS } from '../db/types';
import { setAudioDebug } from '../speech/audioPlayer';
import { setAudioSessionEnabled } from '../speech/audioSession';
import { DiagnosticsPanel } from './shadowing/DiagnosticsPanel';
import { SentenceList } from './shadowing/SentenceList';
import styles from './shadowing/Shadowing.module.css';
import { ShadowingStage } from './shadowing/ShadowingStage';
import { useSeparateRecording } from './shadowing/useSeparateRecording';
import { useShadowingAttempt } from './shadowing/useShadowingAttempt';

// 실패 피드백의 "느린 속도". 너무 느리면 iOS 재생 속도 변환이 뭉개져서 0.75로 둔다
const SLOW_RATE = 0.75;

function useLesson(lessonId: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLesson(null);
    loadLesson(lessonId).then((r) => setLesson(r.lesson), (e) => setError(String(e)));
  }, [lessonId]);
  return { lesson, error };
}

function useLog() {
  const [logs, setLogs] = useState<string[]>([]);
  const log = useCallback((m: string) => {
    const t = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setLogs((prev) => [`${t} ${m}`, ...prev].slice(0, 120));
  }, []);
  return { logs, log };
}

// 수업 안에서 지금 몇 번째 문장인지, 어떤 문장을 통과했는지
function useLessonSteps(lesson: Lesson | null) {
  const [index, setIndex] = useState(0);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);
  const total = lesson?.sentences.length ?? 0;
  const markPassed = useCallback((id: string) => setPassed((s) => (s.has(id) ? s : new Set(s).add(id))), []);
  const next = () => (index < total - 1 ? setIndex(index + 1) : setFinished(true));
  return { index, setIndex, passed, markPassed, finished, total, next };
}

export function ShadowingScreen() {
  const { lessonId = 'beg-01' } = useParams();
  const { lesson, error } = useLesson(lessonId);
  const steps = useLessonSteps(lesson);
  // 진단 스위치는 꺼진 채 시작한다: Phase 0에서 검증된 조건부터 확인하고 하나씩 켜 보기 위해서
  const [recordWhile, setRecordWhile] = useState(false);
  const [sessionOn, setSessionOn] = useState(false);
  const { logs, log } = useLog();
  const settings = DEFAULT_SETTINGS;
  const sentence = lesson?.sentences[steps.index] ?? null;
  const attempt = useShadowingAttempt(sentence, {
    threshold: settings.passThreshold, failFeedback: settings.failFeedback,
    recordWhileListening: recordWhile, slowRate: SLOW_RATE, log
  });
  const separate = useSeparateRecording(log, attempt.setMyVoice);
  const { markPassed } = steps;

  useEffect(() => setAudioSessionEnabled(sessionOn), [sessionOn]);
  useEffect(() => setAudioDebug(log), [log]);
  useEffect(() => {
    if (sentence && attempt.outcome?.status === 'passed') markPassed(sentence.id);
  }, [attempt.outcome?.status, sentence, markPassed]);

  if (error) return <p className={styles.ko} lang="ko">{error}</p>;
  if (!lesson || !sentence) return <p className={styles.ko} lang="ko">불러오는 중…</p>;
  const { index, total, passed } = steps;
  return (
    <TwoColumn list={<SentenceList lesson={lesson} index={index} passed={passed} onPick={steps.setIndex} />}>
      {steps.finished && <p className={styles.pass} lang="ko">이 수업의 문장 {total}개를 모두 통과했어요!</p>}
      <ShadowingStage sentence={sentence} position={`문장 ${index + 1} / ${total}`} attempt={attempt}
        threshold={settings.passThreshold} slowRate={SLOW_RATE}
        canNext={passed.has(sentence.id)} isLast={index === total - 1} onNext={steps.next}
        separate={{ show: !recordWhile, active: separate.active, toggle: separate.toggle }} />
      <DiagnosticsPanel recordWhileListening={recordWhile} onRecordWhileListening={setRecordWhile}
        audioSessionOn={sessionOn} onAudioSessionOn={setSessionOn} logs={logs} />
    </TwoColumn>
  );
}
