import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { StepComplete } from '../components/StepComplete';
import { useCelebration } from '../components/useCelebration';
import type { NewLesson } from '../content/lessonTypes';
import { NEW_STAGE_LABEL, newStagePath, type NewLessonStep } from '../newLessonFlow';
import courseStyles from './courses/Courses.module.css';
import styles from './dialogue/Dialogue.module.css';
import { NewLessonSteps } from './newLesson/NewLessonSteps';
import { useNewLesson } from './newLesson/useNewLesson';
import { MyTurnPanel } from './roleplay/MyTurnPanel';
import { RolePlayLines } from './roleplay/RolePlayLines';
import { useRolePlaySession, type MyLine, type StepResult } from './roleplay/useRolePlaySession';

// 새 레슨 STEP 4 롤플레이(/n/:lessonId/roleplay): 상대 줄은 음성으로, 내 줄은 예시를 참고해 내 말로
export function NewRolePlayScreen() {
  const { lessonId = '' } = useParams();
  const { lesson, error } = useNewLesson(lessonId, 'roleplay');
  if (error) return <p className={courseStyles.meta} lang="ko">{error}</p>;
  if (!lesson) return <p className={courseStyles.meta} lang="ko">불러오는 중…</p>;
  return <RolePlayBody key={lesson.lessonId} lesson={lesson} />;
}

function RolePlayBody({ lesson }: { lesson: NewLesson }) {
  const nav = useNavigate();
  const s = useRolePlaySession(lesson);
  const rp = lesson.rolePlay;
  const line = rp.lines[s.cur];
  // 끝 화면 전에 완료 화면을 한 번. 네 단계를 다 끝냈으면 레슨 완료로 (사용자 요청 2026-11-19)
  const celebrate = useCelebration(s.phase === 'done');
  const myLine: MyLine | null = s.phase === 'practice' && line?.speaker === 'me' ? line : null;
  return (
    <>
      <BackLink to={`/curriculum/${lesson.levelCode}`} label={lesson.level} />
      <ScreenHeader eyebrow={`유닛 ${lesson.unit} · STEP 4 롤플레이`} title={lesson.lessonTitle} />
      <NewLessonSteps lessonId={lesson.lessonId} current="roleplay" />
      <p className={styles.situation} lang="ko">{rp.situation} (상대: {rp.partnerRole})</p>
      {s.phase !== 'intro' && <RolePlayLines lines={rp.lines} partnerRole={rp.partnerRole}
        upTo={s.cur} current={s.phase === 'practice' ? s.cur : null} said={s.said} />}
      {myLine && <MyTurnPanel key={s.cur} line={myLine} turn={s.turn} running={s.running}
        micLocked={s.micLocked} engineNote={s.engineNote}
        onPause={s.stop} onResume={() => s.start(s.cur)} onSkip={s.skip} />}
      {s.notice && <p className={`${styles.result} ${styles.fail}`} lang="ko">{s.notice}</p>}
      {s.phase === 'intro' && <IntroActions locked={s.micLocked} note={s.engineNote} onStart={() => s.start(0)} />}
      {s.phase === 'practice' && !myLine && <PlayActions running={s.running}
        onStop={s.stop} onResume={() => s.start(s.cur)} />}
      {s.phase === 'done' && <DoneActions result={s.result} onAgain={() => s.start(0)}
        onStep={(step) => nav(newStagePath(lesson.lessonId, step))}
        onLevel={() => nav(`/curriculum/${lesson.levelCode}`)} onHome={() => nav('/')} />}
      {celebrate.show && <RolePlayComplete result={s.result} onClose={celebrate.close} />}
    </>
  );
}

function RolePlayComplete({ result, onClose }: { result: StepResult | null; onClose: () => void }) {
  return result?.done
    ? <StepComplete title="Lesson Complete!" subtitle="설명부터 롤플레이까지 모두 끝냈어요" onClose={onClose} />
    : <StepComplete title="Role-play Complete!" subtitle="롤플레이를 끝까지 했어요" onClose={onClose} />;
}

function IntroActions({ locked, note, onStart }: { locked: boolean; note: string | null; onStart: () => void }) {
  return (
    <>
      <p className={styles.situation} lang="ko">
        상대가 먼저 말해요. 내 차례가 되면 마이크가 저절로 켜져요. 예시를 참고해 내 말로 대답하고, ‘꼭 넣을 말’이 모두 들어가면 통과예요.
      </p>
      {locked && note && <p className={courseStyles.meta} lang="ko">{note}</p>}
      <div className={courseStyles.actions}>
        <Button variant="primary" block disabled={locked} onClick={onStart}>▶ 롤플레이 시작</Button>
      </div>
    </>
  );
}

// 상대 줄을 듣는 동안의 버튼. 내 차례에는 마이크 버튼이 멈춤/다시 듣기를 맡는다
function PlayActions({ running, onStop, onResume }: { running: boolean; onStop: () => void; onResume: () => void }) {
  return (
    <div className={courseStyles.actions}>
      {running
        ? <Button block onClick={onStop}>⏸ 멈춤</Button>
        : <Button variant="primary" block onClick={onResume}>▶ 여기서부터 다시</Button>}
    </div>
  );
}

const GO_LABEL: Record<NewLessonStep, string> = { learn: '설명으로', dialogue: '대화문으로', drill: '드릴로', roleplay: '롤플레이로' };

type DoneProps = {
  result: StepResult | null;
  onAgain: () => void; onStep: (s: NewLessonStep) => void; onLevel: () => void; onHome: () => void;
};

// 네 단계를 다 끝냈을 때만 레슨 완료. 아니면 남은 단계로 가는 버튼을 먼저 보여 준다 (사용자 요청 2026-11-18)
function DoneActions({ result, onAgain, onStep, onLevel, onHome }: DoneProps) {
  const missing = result && !result.done ? result.missing : [];
  return (
    <>
      {missing.length
        ? (
          <p className={`${styles.result} ${styles.pass}`} lang="ko">
            롤플레이를 끝냈어요! 남은 단계: {missing.map((m) => NEW_STAGE_LABEL[m]).join(', ')}
          </p>
        )
        : <p className={`${styles.result} ${styles.pass}`} lang="ko">레슨 완료! 설명부터 롤플레이까지 모두 끝냈어요.</p>}
      <div className={courseStyles.actions}>
        {missing.map((m, i) => (
          <Button key={m} variant={i === 0 ? 'primary' : 'secondary'} block onClick={() => onStep(m)}>{GO_LABEL[m]}</Button>
        ))}
        <Button variant={missing.length ? 'secondary' : 'primary'} block onClick={onLevel}>레벨 목록으로</Button>
        <Button block onClick={onHome}>홈으로</Button>
        <Button variant="ghost" block onClick={onAgain}>롤플레이 다시</Button>
      </div>
    </>
  );
}
