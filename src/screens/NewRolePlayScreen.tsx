import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import type { NewLesson } from '../content/lessonTypes';
import courseStyles from './courses/Courses.module.css';
import styles from './dialogue/Dialogue.module.css';
import { NewLessonSteps } from './newLesson/NewLessonSteps';
import { useNewLesson } from './newLesson/useNewLesson';
import { MyTurnPanel } from './roleplay/MyTurnPanel';
import { RolePlayLines } from './roleplay/RolePlayLines';
import { useRolePlaySession, type MyLine } from './roleplay/useRolePlaySession';

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
      {s.phase === 'done' && <DoneActions onAgain={() => s.start(0)}
        onLevel={() => nav(`/curriculum/${lesson.levelCode}`)} onHome={() => nav('/')} />}
    </>
  );
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
