import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import type { NewLesson } from '../content/lessonTypes';
import { markNewStage } from '../db/progress';
import { unlockAudio } from '../speech/audioPlayer';
import courseStyles from './courses/Courses.module.css';
import styles from './dialogue/Dialogue.module.css';
import { useLinePlayer } from './dialogue/useLinePlayer';
import { useNewLesson } from './newLesson/useNewLesson';
import { MyTurnPanel } from './roleplay/MyTurnPanel';
import { RolePlayLines } from './roleplay/RolePlayLines';
import { useRolePlayAttempt, type MyLine, type RpOutcome } from './roleplay/useRolePlayAttempt';

// 통과 글자를 잠깐 보여 준 뒤 다음 상대 줄로 (대화문과 같은 간격)
const PASS_PAUSE_MS = 800;

type Phase = 'intro' | 'practice' | 'done';

// 새 레슨 STEP 4 롤플레이(/n/:lessonId/roleplay): 상대 줄은 음성으로, 내 줄은 예시를 참고해 내 말로
export function NewRolePlayScreen() {
  const { lessonId = '' } = useParams();
  const { lesson, error } = useNewLesson(lessonId, 'roleplay');
  if (error) return <p className={courseStyles.meta} lang="ko">{error}</p>;
  if (!lesson) return <p className={courseStyles.meta} lang="ko">불러오는 중…</p>;
  return <RolePlayBody key={lesson.lessonId} lesson={lesson} />;
}

// 진행 순서: go(from)이 상대 줄을 이어서 틀고 내 줄에 닿으면 멈춘다. 끝에 닿으면 진도를 '완료'로 남긴다
function useRolePlayPractice(lesson: NewLesson) {
  const lines = lesson.rolePlay.lines;
  const player = useLinePlayer(lines);
  const { playPartners } = player;
  const [phase, setPhase] = useState<Phase>('intro');
  const [cur, setCur] = useState(0);
  const [round, setRound] = useState(0);
  const [said, setSaid] = useState<Record<number, string>>({});

  // 홈·레벨 목록은 진도를 화면을 열 때 한 번 읽는다. 저장이 끝난 뒤 완료 화면을 보여 줘야 바로 '완료'로 보인다
  const finish = useCallback(async () => {
    await markNewStage(lesson.lessonId, lesson.levelCode, 'done').catch(() => undefined);
    setPhase('done');
  }, [lesson.lessonId, lesson.levelCode]);

  const go = useCallback((from: number) => {
    setCur(from);
    playPartners(from).then((i) => {
      if (i === null) return;
      setCur(i);
      if (i >= lines.length) void finish();
    });
  }, [playPartners, lines.length, finish]);

  const start = () => {
    unlockAudio(); // iOS: 탭한 순간 먼저
    setSaid({});
    setRound((r) => r + 1);
    setPhase('practice');
    go(0);
  };
  const record = (no: number, text: string) => setSaid((s) => ({ ...s, [no]: text }));
  const line = lines[cur];
  const myLine: MyLine | null = phase === 'practice' && player.playing === null && line?.speaker === 'me' ? line : null;
  return { lines, player, phase, cur, round, said, go, start, record, myLine };
}

function RolePlayBody({ lesson }: { lesson: NewLesson }) {
  const nav = useNavigate();
  const p = useRolePlayPractice(lesson);
  const timer = useRef<number | null>(null);
  const clearTimer = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; };
  useEffect(() => clearTimer, []);
  const onResult = (o: RpOutcome) => {
    if (o.status !== 'passed' || !p.myLine) return;
    const at = p.cur;
    p.record(p.myLine.no, o.judgement.heard);
    clearTimer();
    timer.current = window.setTimeout(() => p.go(at + 1), PASS_PAUSE_MS);
  };
  const attempt = useRolePlayAttempt(p.myLine, `${p.round}-${p.cur}`, onResult);
  const skip = () => {
    if (!p.myLine) return;
    clearTimer();
    p.record(p.myLine.no, '');
    p.go(p.cur + 1);
  };
  const rp = lesson.rolePlay;
  return (
    <>
      <BackLink to={`/curriculum/${lesson.levelCode}`} label={lesson.level} />
      <ScreenHeader eyebrow={`유닛 ${lesson.unit} · STEP 4 롤플레이`} title={lesson.lessonTitle} />
      <p className={styles.situation} lang="ko">{rp.situation} (상대: {rp.partnerRole})</p>
      {p.phase !== 'intro' && <RolePlayLines lines={p.lines} partnerRole={rp.partnerRole}
        upTo={p.cur} current={p.phase === 'practice' ? (p.player.playing ?? p.cur) : null} said={p.said} />}
      {p.myLine && attempt.outcome && <MyTurnPanel key={`${p.round}-${p.cur}`} line={p.myLine} outcome={attempt.outcome}
        micLocked={attempt.micLocked} engineNote={attempt.engineNote}
        onStart={() => { void attempt.start(); }} onStop={attempt.stop} onSkip={skip} />}
      {p.phase === 'intro' && <IntroActions onStart={p.start} />}
      {p.phase === 'done' && <DoneActions onAgain={p.start}
        onLevel={() => nav(`/curriculum/${lesson.levelCode}`)} onHome={() => nav('/')} />}
    </>
  );
}

function IntroActions({ onStart }: { onStart: () => void }) {
  return (
    <>
      <p className={styles.situation} lang="ko">
        상대가 먼저 말해요. 내 차례에는 예시를 참고해 내 말로 대답하세요. ‘꼭 넣을 말’이 모두 들어가면 통과예요.
      </p>
      <div className={courseStyles.actions}>
        <Button variant="primary" block onClick={onStart}>롤플레이 시작</Button>
      </div>
    </>
  );
}

type DoneProps = { onAgain: () => void; onLevel: () => void; onHome: () => void };

function DoneActions({ onAgain, onLevel, onHome }: DoneProps) {
  return (
    <>
      <p className={`${styles.result} ${styles.pass}`} lang="ko">레슨 완료! 설명부터 롤플레이까지 모두 끝냈어요.</p>
      <div className={courseStyles.actions}>
        <Button variant="primary" block onClick={onLevel}>레벨 목록으로</Button>
        <Button block onClick={onHome}>홈으로</Button>
        <Button variant="ghost" block onClick={onAgain}>롤플레이 다시</Button>
      </div>
    </>
  );
}
