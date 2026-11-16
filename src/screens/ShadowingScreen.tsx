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
import { useAutoAdvance, useLessonSteps } from './shadowing/useLessonSteps';
import { useSavedSentences } from './shadowing/useSavedSentences';
import { useShadowingAttempt, type AttemptStatus } from './shadowing/useShadowingAttempt';

// 실패 피드백의 "느린 속도". 너무 느리면 iOS 재생 속도 변환이 뭉개져서 0.75로 둔다
const SLOW_RATE = 0.75;

function useLesson(lessonId: string) {
  const [data, setData] = useState<{ lesson: Lesson; courseId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setData(null);
    loadLesson(lessonId).then((r) => setData({ lesson: r.lesson, courseId: r.course.id }), (e) => setError(String(e)));
  }, [lessonId]);
  return { lesson: data?.lesson ?? null, courseId: data?.courseId ?? null, error };
}

function useLog() {
  const [logs, setLogs] = useState<string[]>([]);
  const log = useCallback((m: string) => {
    const t = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setLogs((prev) => [`${t} ${m}`, ...prev].slice(0, 120));
  }, []);
  return { logs, log };
}

// 진단 패널의 스위치와 기록
function useDiagnostics() {
  // 아이폰 결과 6·7차(2026-11-16): 같이 녹음하면 앱을 켠 뒤 첫 시도만 되고, 두 번째부터 마이크가
  // 무음(최대 소리 0.000)이 되어 인식까지 안 된다. 한 번 그렇게 되면 녹음을 꺼도 앱을 다시 열 때까지
  // 안 풀린다. 그래서 녹음은 기본으로 끄고(사용자 결정: 인식이 우선, 내 목소리 녹음은 없어도 됨)
  // 마이크는 음성 인식만 쓰게 한다. 스위치는 원인 확인용으로만 남긴다
  const [recordWhile, setRecordWhile] = useState(false);
  const [sessionOn, setSessionOn] = useState(false);
  const [pcm, setPcm] = useState(false);
  const [warmUp, setWarmUp] = useState(false);
  const { logs, log } = useLog();
  useEffect(() => setAudioSessionEnabled(sessionOn), [sessionOn]);
  useEffect(() => setAudioDebug(log), [log]);
  return { recordWhile, setRecordWhile, sessionOn, setSessionOn, pcm, setPcm, warmUp, setWarmUp, logs, log };
}

export function ShadowingScreen() {
  const { lessonId = 'beg-01' } = useParams();
  const { lesson, courseId, error } = useLesson(lessonId);
  // 설정 화면은 Phase 7. 그 전까지는 기본값을 쓴다
  const settings = DEFAULT_SETTINGS;
  const steps = useLessonSteps(lesson, settings.repeatCount);
  const diag = useDiagnostics();
  const { log } = diag;
  // 앱을 다시 열면 꺼짐으로 돌아간다 (기억은 설정 화면과 함께 Phase 7)
  const [autoOn, setAutoOn] = useState(settings.autoAdvance);
  const sentence = lesson?.sentences[steps.index] ?? null;
  const auto = useAutoAdvance(autoOn, sentence?.id, steps.next);
  const saved = useSavedSentences(lesson, courseId, log);
  const onResult = (id: string, status: AttemptStatus) => {
    if (status === 'passed' && steps.recordPass(id) && autoOn) auto.schedule();
  };
  const attempt = useShadowingAttempt(sentence, {
    threshold: settings.passThreshold, failFeedback: settings.failFeedback,
    recordWhileListening: diag.recordWhile, pcmFallback: diag.pcm, warmUpMic: diag.warmUp,
    slowRate: SLOW_RATE, log, onResult
  });

  if (error) return <p className={styles.ko} lang="ko">{error}</p>;
  if (!lesson || !sentence) return <p className={styles.ko} lang="ko">불러오는 중…</p>;
  const { index, total, cleared } = steps;
  const listening = attempt.outcome?.status === 'listening';
  return (
    <TwoColumn list={<SentenceList lesson={lesson} index={index} cleared={cleared} locked={listening} onPick={steps.setIndex} />}>
      {steps.finished && <p className={styles.pass} lang="ko">이 수업의 문장 {total}개를 모두 통과했어요!</p>}
      <ShadowingStage sentence={sentence} position={`문장 ${index + 1} / ${total}`} attempt={attempt}
        threshold={settings.passThreshold} slowRate={SLOW_RATE}
        passes={steps.counts.get(sentence.id) ?? 0} required={settings.repeatCount}
        canNext={cleared.has(sentence.id)} isLast={index === total - 1} onNext={steps.next}
        onMic={() => { auto.cancel(); attempt.start(); }}
        saved={saved.saved.has(sentence.id)} saveError={saved.error} onSave={() => saved.save(sentence)}
        autoOn={autoOn} onAutoOn={setAutoOn} autoPending={auto.pending} />
      <DiagnosticsPanel recordWhileListening={diag.recordWhile} onRecordWhileListening={diag.setRecordWhile}
        audioSessionOn={diag.sessionOn} onAudioSessionOn={diag.setSessionOn}
        pcmFallback={diag.pcm} onPcmFallback={diag.setPcm} warmUpMic={diag.warmUp} onWarmUpMic={diag.setWarmUp}
        logs={diag.logs} />
    </TwoColumn>
  );
}
