import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepComplete } from '../components/StepComplete';
import { useCelebration } from '../components/useCelebration';
import type { DialogueLine, NewLesson } from '../content/lessonTypes';
import type { Sentence } from '../content/types';
import { logActivity } from '../db/activity';
import { finishNewStep } from '../db/progress';
import { unlockAudio } from '../speech/audioPlayer';
import { newStagePath, nextNewStage } from '../newLessonFlow';
import { useSettings } from '../settings/SettingsProvider';
import styles from './dialogue/Dialogue.module.css';
import { DialogueOverview } from './dialogue/DialogueOverview';
import { DialoguePractice } from './dialogue/DialoguePractice';
import { useLinePlayer } from './dialogue/useLinePlayer';
import { LessonStepBar } from './newLesson/LessonStepBar';
import { useNewLesson } from './newLesson/useNewLesson';
import { useNewSpeaking } from './newLesson/useNewSpeaking';

// 통과 글자를 잠깐 보여 준 뒤 다음 상대 줄로
const PASS_PAUSE_MS = 800;

export type DialoguePhase = 'intro' | 'practice' | 'done';

// 다시 연습할 때 앞 판의 "통과"가 남아 마이크가 잠기지 않도록 판 번호(round)를 id에 붙인다
function lineSentence(lessonId: string, l: DialogueLine, round: number): Sentence {
  return { id: `${lessonId}-dlg${l.no}-${round}`, en: l.en, ko: l.ko, note: '', hintWords: [], vocab: [], variations: [], audio: l.audio };
}

// 새 레슨 STEP 2 대화문(/n/:lessonId/dialogue): 전체 듣기 → 상대 줄은 자동 재생, 내 줄에서 멈추고 말하기
export function DialogueScreen() {
  const { lessonId = '' } = useParams();
  const { lesson, error } = useNewLesson(lessonId, 'dialogue');
  if (error) return <p className={styles.note} lang="ko">{error}</p>;
  if (!lesson) return <p className={styles.note} lang="ko">불러오는 중…</p>;
  return <DialogueBody key={lesson.lessonId} lesson={lesson} />;
}

// 연습 순서: go(from)이 상대 줄을 이어서 틀고 내 줄에 닿으면 멈춘다.
// 말하기 문장(meIdx)은 내 줄에 닿았을 때만 바꾼다 — 상대 줄 재생 중에 바꾸면 말하기 엔진이 재생을 끊는다
function useDialoguePractice(lesson: NewLesson) {
  const lines = lesson.dialogue.lines;
  const player = useLinePlayer(lines);
  const { playPartners } = player;
  const [phase, setPhase] = useState<DialoguePhase>('intro');
  const [cur, setCur] = useState(0);
  const [meIdx, setMeIdx] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const nextRound = useRef(0);
  const curRef = useRef(cur);
  curRef.current = cur;

  const go = useCallback((from: number) => {
    setCur(from);
    playPartners(from).then((i) => {
      if (i === null) return;
      setCur(i);
      if (i >= lines.length) setPhase('done');
      else { setMeIdx(i); setRound(nextRound.current); }
    });
  }, [playPartners, lines.length]);

  const start = () => {
    unlockAudio(); // iOS: 탭한 순간 먼저
    setPhase('practice');
    nextRound.current += 1; // 판 번호는 내 줄에 닿을 때 바꾼다 (지금 바꾸면 막 시작한 상대 줄 재생이 끊긴다)
    go(0);
  };
  const sentence = useMemo(() => (meIdx === null ? null : lineSentence(lesson.lessonId, lines[meIdx], round)), [meIdx, lines, lesson.lessonId, round]);
  return { lines, player, phase, cur, curRef, meIdx, go, start, sentence };
}

// 통과하면 잠깐 뒤 다음 줄로. 화면을 떠나면 기다리던 이동을 취소한다
function usePassTimer() {
  const timer = useRef<number | null>(null);
  const clear = useCallback(() => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; }, []);
  useEffect(() => clear, [clear]);
  const later = useCallback((fn: () => void) => { clear(); timer.current = window.setTimeout(fn, PASS_PAUSE_MS); }, [clear]);
  return { clear, later };
}

// 위쪽 막대의 대화문 칸: 처음엔 빈 칸, 연습 중엔 지나간 줄만큼, 끝나면 꽉
function dialogueFill(phase: DialoguePhase, cur: number, total: number): number {
  if (phase === 'done') return 1;
  return phase === 'practice' ? cur / total : 0;
}

function DialogueBody({ lesson }: { lesson: NewLesson }) {
  const nav = useNavigate();
  const d = useDialoguePractice(lesson);
  // 대화문에는 기준 점수가 따로 없어 설정의 통과 기준을 쓴다
  const threshold = useSettings().settings.passThreshold;
  const pass = usePassTimer();
  // 끝까지 가면(건너뛴 줄이 있어도) 대화문 단계를 끝낸 것으로 (사용자 결정 2026-11-18)
  useEffect(() => {
    if (d.phase === 'done') finishNewStep(lesson.lessonId, lesson.levelCode, 'dialogue').catch(() => undefined);
  }, [d.phase, lesson.lessonId, lesson.levelCode]);
  const speaking = useNewSpeaking(d.sentence, {
    threshold, failFeedback: false,
    onResult: (_id, status) => {
      if (status !== 'passed') return;
      logActivity('practice');
      pass.later(() => d.go(d.curRef.current + 1));
    }
  });
  // 끝까지 가면 완료 화면을 한 번 (사용자 요청 2026-11-19)
  const celebrate = useCelebration(d.phase === 'done');
  // 상대 줄 재생·다시 듣기 중에는 내 차례가 아니다 (잡음 대책: 소리가 나는 동안 마이크를 열지 않는다)
  const busy = d.player.playing !== null || d.player.echo !== null;
  const myTurn = d.phase === 'practice' && !busy && d.meIdx === d.cur;
  useAutoListen(myTurn && !speaking.micLocked, d.sentence?.id, speaking.attempt.start);
  return (
    <div className={styles.page}>
      <LessonStepBar lessonId={lesson.lessonId} current="dialogue" fill={dialogueFill(d.phase, d.cur, d.lines.length)} />
      {d.phase === 'practice'
        ? <DialoguePractice lesson={lesson} d={d} speaking={speaking} myTurn={myTurn} busy={busy} threshold={threshold}
          onSkip={() => { pass.clear(); d.go(d.cur + 1); }} />
        : <DialogueOverview lesson={lesson} phase={d.phase} player={d.player} onStart={d.start}
          onNext={() => nav(newStagePath(lesson.lessonId, nextNewStage('dialogue')))} />}
      {celebrate.show && <StepComplete title="Dialogue Complete!" onClose={celebrate.close} />}
    </div>
  );
}

export type DialoguePracticeState = ReturnType<typeof useDialoguePractice>;

// 내 차례가 되면 마이크를 저절로 한 번 연다 (사용자 요청 2026-11-19). 틀린 뒤 다시 말하기는 직접 탭.
// 문장 id에 판 번호가 붙어 있어 "다시 연습"에서도 줄마다 한 번씩 열린다.
// 상대 줄 재생이 끝난 뒤라 iOS에서도 탭 없이 마이크가 열린다 (롤플레이와 같은 방식)
function useAutoListen(ready: boolean, sentenceId: string | undefined, start: () => void) {
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !sentenceId || opened.current === sentenceId) return;
    opened.current = sentenceId;
    start();
  }, [ready, sentenceId, start]);
}
