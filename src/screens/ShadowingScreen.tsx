import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TwoColumn } from '../components/TwoColumn';
import { loadLesson } from '../content/loader';
import type { Model } from 'vosk-browser';
import type { Lesson, Sentence } from '../content/types';
import { useSettings } from '../settings/SettingsProvider';
import { setAudioDebug } from '../speech/audioPlayer';
import { setAudioSessionEnabled } from '../speech/audioSession';
import { TUTOR_SAFE_MIC } from '../speech/micSlot';
import { toVariationLesson, type PracticeKind } from '../lessonFlow';
import { SavedFinish } from './library/SavedFinish';
import { DiagnosticsPanel } from './shadowing/DiagnosticsPanel';
import { FinishPanel } from './shadowing/FinishPanel';
import { useStageProgress } from './shadowing/useStageProgress';
import { SentenceList } from './shadowing/SentenceList';
import styles from './shadowing/Shadowing.module.css';
import { ShadowingStage, type HandsFreeView } from './shadowing/ShadowingStage';
import { useHandsFree } from './shadowing/useHandsFree';
import { useSecretTaps } from './shadowing/useSecretTaps';
import { useAutoAdvance, useLessonSteps } from './shadowing/useLessonSteps';
import { useSavedSentences } from './shadowing/useSavedSentences';
import { useShadowingAttempt, type AttemptStatus } from './shadowing/useShadowingAttempt';
import { useVoskModel, type VoskModelState } from './shadowing/useVoskModel';

// 실패 피드백의 "느린 속도". 너무 느리면 iOS 재생 속도 변환이 뭉개져서 0.75로 둔다
const SLOW_RATE = 0.75;

// fixed: 보관함 연습처럼 이미 만들어진 문장 묶음을 줄 때는 파일을 읽지 않는다 (코스 id도 없어 진도에 기록되지 않는다)
function useLesson(lessonId: string, fixed?: Lesson) {
  const [data, setData] = useState<{ lesson: Lesson; courseId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (fixed) return;
    setData(null);
    loadLesson(lessonId).then((r) => setData({ lesson: r.lesson, courseId: r.course.id }), (e) => setError(String(e)));
  }, [lessonId, fixed]);
  if (fixed) return { lesson: fixed, courseId: null, error: null };
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
  // 아이폰 결과 8차: 녹음을 다 빼도 두 번째 인식부터 먹통 → iOS 27 버그(WebKit 321436). 우회를 기본으로 켠다
  const [ios27Fix, setIos27Fix] = useState(true);
  // 아이폰 결과 10·11차: 앱 안 인식(Vosk)은 연속으로 잘 된다 → 기본. 끄면 내장 인식(비교용)
  const [vosk, setVosk] = useState(true);
  const [secondOpinion, setSecondOpinion] = useState(true);
  // ⑧ 켬 = 마이크 소리 처리(에코 제거·잡음 억제) 끄기. 아이폰 비교 전까지 지금처럼 처리 켬을 기본으로
  const [rawMic, setRawMic] = useState(false);
  // ⑨ 이어 말하기 중 튜터가 읽는 동안 마이크 끄기, ⑩ ⑧과 함께 처리 없는 마이크 소리 키우기
  // (튜터 목소리 잡음 비교용, 2026-11-19). 아이폰 비교 전까지 둘 다 꺼짐 = 지금과 같음
  const [micOff, setMicOff] = useState(false);
  const [boost, setBoost] = useState(false);
  const { logs, log } = useLog();
  useEffect(() => setAudioSessionEnabled(sessionOn), [sessionOn]);
  useEffect(() => setAudioDebug(log), [log]);
  return {
    recordWhile, setRecordWhile, sessionOn, setSessionOn, pcm, setPcm, warmUp, setWarmUp,
    ios27Fix, setIos27Fix, vosk, setVosk, secondOpinion, setSecondOpinion, rawMic, setRawMic,
    micOff, setMicOff, boost, setBoost, logs, log
  };
}

// 드릴·롤플레이와 같은 배수 (25배는 작게 말해도 꽉 찬 적이 있어 15배로, 사용자 결정 2026-11-19)
const RAW_MIC_GAIN = TUTOR_SAFE_MIC.micGain;

type Diag = ReturnType<typeof useDiagnostics>;

const MODEL_NOTE: Record<VoskModelState, string | null> = {
  off: null,
  loading: '음성 인식 준비 중… 처음 한 번만 약 40MB를 받아서 1~2분 걸릴 수 있어요',
  ready: null,
  error: '음성 인식 준비에 실패했어요. 인터넷 연결을 확인하고 앱을 다시 열어 주세요.'
};

const KIND_TEXT: Record<PracticeKind, { label: string; lastLabel: string }> = {
  shadowing: { label: '쉐도잉', lastLabel: '쉐도잉 마치기' },
  variation: { label: '변형 연습', lastLabel: '변형 연습 마치기' },
  review: { label: '복습', lastLabel: '수업 마치기' }
};

// 같은 말하기 엔진으로 세 단계를 돌린다: 쉐도잉(핵심 문장) → 변형 연습(변형 문장) → 복습(핵심 문장 다시)
const SAVED_TEXT = { label: '보관함 연습', lastLabel: '연습 마치기' };

export function ShadowingScreen({ kind = 'shadowing', fixedLesson }: { kind?: PracticeKind; fixedLesson?: Lesson }) {
  const { lessonId = 'beg-01' } = useParams();
  const { lesson: fullLesson, courseId, error } = useLesson(lessonId, fixedLesson);
  const lesson = useMemo(
    () => (fullLesson && kind === 'variation' ? toVariationLesson(fullLesson) : fullLesson),
    [fullLesson, kind]
  );
  const { settings } = useSettings();
  const steps = useLessonSteps(lesson, settings.repeatCount);
  const diag = useDiagnostics();
  const { log } = diag;
  const vosk = useVoskModel(diag.vosk, log);
  // 화면의 스위치는 이번 화면에서만 바뀌고, 처음 상태는 설정의 "자동 넘기기"를 따른다
  const [autoOn, setAutoOn] = useState(settings.autoAdvance);
  const sentence = lesson?.sentences[steps.index] ?? null;
  const auto = useAutoAdvance(autoOn, sentence?.id, steps.next);
  const saved = useSavedSentences(lesson, courseId, log);
  useStageProgress(lessonId, courseId, kind, steps.finished);
  const onResult = (id: string, status: AttemptStatus) => {
    if (status === 'passed' && steps.recordPass(id) && autoOn) auto.schedule();
  };
  const { attempt, hf } = useSpeaking(sentence, lesson, steps, diag, vosk.model, onResult);
  // 진단 패널은 평소 숨긴다. 숨겨도 기록은 계속 모아서, 열었을 때 바로 "기록 복사"할 수 있다
  const [showDiag, setShowDiag] = useState(false);
  const secretTap = useSecretTaps(() => setShowDiag((v) => !v));

  if (error) return <p className={styles.ko} lang="ko">{error}</p>;
  if (!lesson || !sentence) return <p className={styles.ko} lang="ko">불러오는 중…</p>;
  const { index, total, cleared } = steps;
  const listening = attempt.outcome?.status === 'listening' || hf.running;
  const handsFree: HandsFreeView = {
    available: diag.vosk && vosk.state === 'ready', running: hf.running, step: hf.step, notice: hf.notice,
    onToggle: () => { auto.cancel(); if (hf.running) hf.stop(); else hf.start(); }
  };
  return (
    <TwoColumn list={<SentenceList lesson={lesson} index={index} cleared={cleared} locked={listening} onPick={steps.setIndex} />}>
      {steps.finished && (fixedLesson
        ? <SavedFinish total={total} />
        : <FinishPanel kind={kind} lessonId={lessonId} courseId={courseId} total={total} />)}
      <ShadowingStage sentence={sentence} tapWords {...(fixedLesson ? SAVED_TEXT : KIND_TEXT[kind])} saveable={kind !== 'variation' && !fixedLesson} position={`문장 ${index + 1} / ${total}`} attempt={attempt}
        threshold={settings.passThreshold} slowRate={SLOW_RATE}
        passes={steps.counts.get(sentence.id) ?? 0} required={settings.repeatCount}
        canNext={cleared.has(sentence.id)} isLast={index === total - 1} onNext={steps.next}
        onSkip={() => { auto.cancel(); steps.skip(); }}
        onMic={() => { auto.cancel(); attempt.start(); }}
        saved={saved.saved.has(sentence.id)} saveError={saved.error} onSave={() => saved.save(sentence)}
        autoOn={autoOn} onAutoOn={setAutoOn} autoPending={auto.pending}
        engineNote={MODEL_NOTE[vosk.state]} micLocked={diag.vosk && vosk.state !== 'ready'} handsFree={handsFree} onSecretTap={secretTap} />
      {showDiag && <Diagnostics diag={diag} voskState={vosk.state} locked={listening} />}
    </TwoColumn>
  );
}

// 말하기 두 가지: 마이크를 눌러 한 번 듣기(attempt)와 손 안 대고 이어 말하기(hf).
// 같은 "이어 말하기 중" 표시를 함께 봐서 둘이 동시에 마이크를 열지 않는다
function useSpeaking(
  sentence: Sentence | null, lesson: Lesson | null, steps: ReturnType<typeof useLessonSteps>,
  diag: Diag, voskModel: Model | null, onResult: (id: string, status: AttemptStatus) => void
) {
  const { settings } = useSettings();
  const { log } = diag;
  const handsFreeActive = useRef(false);
  const micGain = diag.rawMic && diag.boost ? RAW_MIC_GAIN : 1;
  const attempt = useShadowingAttempt(sentence, {
    threshold: settings.passThreshold, failFeedback: settings.failFeedback,
    recordWhileListening: diag.recordWhile, pcmFallback: diag.pcm, warmUpMic: diag.warmUp,
    ios27Fix: diag.ios27Fix, slowRate: SLOW_RATE, log, onResult, handsFreeActive,
    engine: diag.vosk ? 'vosk' : 'builtin', voskModel, secondOpinion: diag.secondOpinion,
    micProcessing: !diag.rawMic, micGain
  });
  const hf = useHandsFree({
    lesson, index: steps.index, cleared: steps.cleared, recordPass: steps.recordPass, next: steps.next,
    attempt, active: handsFreeActive, slowRate: SLOW_RATE, failFeedback: settings.failFeedback,
    micProcessing: !diag.rawMic, micGain, micOffWhilePlaying: diag.micOff, log
  });
  return { attempt, hf };
}

function Diagnostics({ diag, voskState, locked }: { diag: Diag; voskState: VoskModelState; locked: boolean }) {
  return (
    <DiagnosticsPanel vosk={diag.vosk} onVosk={diag.setVosk} voskState={voskState}
      secondOpinion={diag.secondOpinion} onSecondOpinion={diag.setSecondOpinion} locked={locked}
      rawMic={diag.rawMic} onRawMic={diag.setRawMic}
      micOff={diag.micOff} onMicOff={diag.setMicOff} boost={diag.boost} onBoost={diag.setBoost}
      recordWhileListening={diag.recordWhile} onRecordWhileListening={diag.setRecordWhile}
      audioSessionOn={diag.sessionOn} onAudioSessionOn={diag.setSessionOn}
      pcmFallback={diag.pcm} onPcmFallback={diag.setPcm} warmUpMic={diag.warmUp} onWarmUpMic={diag.setWarmUp}
      ios27Fix={diag.ios27Fix} onIos27Fix={diag.setIos27Fix}
      logs={diag.logs} />
  );
}
