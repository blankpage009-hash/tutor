import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { StepComplete } from '../components/StepComplete';
import { useCelebration } from '../components/useCelebration';
import type { DialogueLine, NewLesson } from '../content/lessonTypes';
import type { Sentence } from '../content/types';
import { finishNewStep } from '../db/progress';
import { unlockAudio } from '../speech/audioPlayer';
import { newStagePath, nextNewStage } from '../newLessonFlow';
import courseStyles from './courses/Courses.module.css';
import styles from './dialogue/Dialogue.module.css';
import { DialogueCard } from './dialogue/DialogueCard';
import { DialogueLines } from './dialogue/DialogueLines';
import { MyLinePanel } from './dialogue/MyLinePanel';
import { useLinePlayer } from './dialogue/useLinePlayer';
import { NewLessonSteps } from './newLesson/NewLessonSteps';
import { useNewLesson } from './newLesson/useNewLesson';
import { useNewSpeaking } from './newLesson/useNewSpeaking';

// 대화문에는 기준 점수가 따로 없어 드릴 기준(80%)과 맞춘다
const THRESHOLD = 0.8;
// 통과 글자를 잠깐 보여 준 뒤 다음 상대 줄로
const PASS_PAUSE_MS = 800;

type Phase = 'intro' | 'practice' | 'done';

// 다시 연습할 때 앞 판의 "통과"가 남아 마이크가 잠기지 않도록 판 번호(round)를 id에 붙인다
function lineSentence(lessonId: string, l: DialogueLine, round: number): Sentence {
  return { id: `${lessonId}-dlg${l.no}-${round}`, en: l.en, ko: l.ko, note: '', hintWords: [], vocab: [], variations: [], audio: l.audio };
}

// 새 레슨 STEP 2 대화문(/n/:lessonId/dialogue): 전체 듣기 → 상대 줄은 자동 재생, 내 줄에서 멈추고 말하기
export function DialogueScreen() {
  const { lessonId = '' } = useParams();
  const { lesson, error } = useNewLesson(lessonId, 'dialogue');
  if (error) return <p className={courseStyles.meta} lang="ko">{error}</p>;
  if (!lesson) return <p className={courseStyles.meta} lang="ko">불러오는 중…</p>;
  return <DialogueBody key={lesson.lessonId} lesson={lesson} />;
}

// 연습 순서: go(from)이 상대 줄을 이어서 틀고 내 줄에 닿으면 멈춘다.
// 말하기 문장(meIdx)은 내 줄에 닿았을 때만 바꾼다 — 상대 줄 재생 중에 바꾸면 말하기 엔진이 재생을 끊는다
function useDialoguePractice(lesson: NewLesson) {
  const lines = lesson.dialogue.lines;
  const player = useLinePlayer(lines);
  const { playPartners } = player;
  const [phase, setPhase] = useState<Phase>('intro');
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

function DialogueBody({ lesson }: { lesson: NewLesson }) {
  const nav = useNavigate();
  const d = useDialoguePractice(lesson);
  const timer = useRef<number | null>(null);
  const clearTimer = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; };
  useEffect(() => clearTimer, []);
  // 끝까지 가면(건너뛴 줄이 있어도) 대화문 단계를 끝낸 것으로 (사용자 결정 2026-11-18)
  useEffect(() => {
    if (d.phase === 'done') finishNewStep(lesson.lessonId, lesson.levelCode, 'dialogue').catch(() => undefined);
  }, [d.phase, lesson.lessonId, lesson.levelCode]);
  const speaking = useNewSpeaking(d.sentence, {
    threshold: THRESHOLD, failFeedback: false,
    onResult: (_id, status) => {
      if (status !== 'passed') return;
      clearTimer();
      timer.current = window.setTimeout(() => d.go(d.curRef.current + 1), PASS_PAUSE_MS);
    }
  });
  // 끝까지 가면 완료 화면을 한 번 (사용자 요청 2026-11-19)
  const celebrate = useCelebration(d.phase === 'done');
  const myTurn = d.phase === 'practice' && d.player.playing === null && d.meIdx === d.cur;
  const shown = d.player.playing ?? d.cur;
  useAutoListen(myTurn && !speaking.micLocked, d.sentence?.id, speaking.attempt.start);
  return (
    <>
      <BackLink to={`/curriculum/${lesson.levelCode}`} label={lesson.level} />
      {/* 말하기 중에는 카드에 집중하게 제목만 작게 (사용자 요청 2026-11-19) */}
      {d.phase === 'practice'
        ? <p className={styles.miniTitle} lang="ko">{lesson.lessonTitle}</p>
        : <>
          <ScreenHeader eyebrow={`유닛 ${lesson.unit} · STEP 2 대화문`} title={lesson.lessonTitle} />
          <NewLessonSteps lessonId={lesson.lessonId} current="dialogue" />
          <p className={styles.situation} lang="ko">{lesson.dialogue.situation} (상대: {lesson.dialogue.partnerRole})</p>
        </>}
      {/* 처음·끝에는 대화문 전체, Speak 연습 중에는 지금 줄 하나만 박스로 (사용자 요청 2026-11-19) */}
      {d.phase !== 'practice' && <DialogueLines lessonId={lesson.lessonId} lines={d.lines} partnerRole={lesson.dialogue.partnerRole}
        current={d.player.playing} />}
      {d.phase === 'practice' && shown < d.lines.length && (
        <DialogueCard lessonId={lesson.lessonId} line={d.lines[shown]} index={shown} total={d.lines.length}
          partnerRole={lesson.dialogue.partnerRole} outcome={myTurn ? speaking.attempt.outcome : undefined}>
          {/* 상대 줄에도 같은 패널을 (잠근 채) 두어 카드 위치·크기가 내 차례와 똑같게 */}
          <MyLinePanel attempt={speaking.attempt} threshold={THRESHOLD} engineNote={speaking.engineNote}
            micLocked={speaking.micLocked} waiting={!myTurn} onSkip={() => { clearTimer(); d.go(d.cur + 1); }} />
        </DialogueCard>
      )}
      {d.phase === 'intro' && <IntroActions playing={d.player.playing !== null}
        onPlayAll={() => { void d.player.playAll(); }} onStop={d.player.stop} onStart={d.start} />}
      {d.phase === 'done' && <DoneActions lesson={lesson} onAgain={d.start}
        onNext={() => nav(newStagePath(lesson.lessonId, nextNewStage('dialogue')))} />}
      {celebrate.show && <StepComplete title="Dialogue Complete!" subtitle="대화문을 끝까지 했어요" onClose={celebrate.close} />}
    </>
  );
}

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

type IntroProps ={ playing: boolean; onPlayAll: () => void; onStop: () => void; onStart: () => void };

function IntroActions({ playing, onPlayAll, onStop, onStart }: IntroProps) {
  return (
    <div className={courseStyles.actions}>
      {playing
        ? <Button block onClick={onStop}>Stop</Button>
        : <Button block onClick={onPlayAll}>Listen</Button>}
      <Button variant="primary" block disabled={playing} onClick={onStart}>Speak</Button>
    </div>
  );
}

function DoneActions({ lesson, onAgain, onNext }: { lesson: NewLesson; onAgain: () => void; onNext: () => void }) {
  return (
    <>
      <p className={`${styles.result} ${styles.pass}`} lang="ko">대화문을 끝까지 했어요!</p>
      <h2 className={styles.heading} lang="ko">표현 노트</h2>
      <ul className={styles.notes}>
        {lesson.dialogue.expressionNotes.map((n) => (
          <li key={n.en}>
            <p className={styles.en} lang="en">{n.en}</p>
            <p className={styles.ko} lang="ko">{n.ko}</p>
          </li>
        ))}
      </ul>
      <div className={courseStyles.actions}>
        <Button variant="primary" block onClick={onNext}>Next: Drill</Button>
        <Button block onClick={onAgain}>Practice Again</Button>
      </div>
    </>
  );
}
