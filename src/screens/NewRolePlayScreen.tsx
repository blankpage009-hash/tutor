import { useNavigate, useParams } from 'react-router-dom';
import { StepComplete } from '../components/StepComplete';
import { useCelebration } from '../components/useCelebration';
import { newStagePath } from '../newLessonFlow';
import dialogueStyles from './dialogue/Dialogue.module.css';
import { useNewLesson } from './newLesson/useNewLesson';
import { CustomDoneActions, DoneActions } from './roleplay/RolePlayDone';
import { RolePlayIntro } from './roleplay/RolePlayIntro';
import { RolePlayLines } from './roleplay/RolePlayLines';
import { RolePlayPractice } from './roleplay/RolePlayPractice';
import { RolePlayTop } from './roleplay/RolePlayTop';
import { useRolePlaySession, type Phase, type RolePlaySource, type StepResult } from './roleplay/useRolePlaySession';

// 새 레슨 STEP 4 롤플레이(/n/:lessonId/roleplay): 상대 줄은 음성으로, 내 줄은 예시를 참고해 내 말로
export function NewRolePlayScreen() {
  const { lessonId = '' } = useParams();
  const { lesson, error } = useNewLesson(lessonId, 'roleplay');
  if (error) return <p className={dialogueStyles.note} lang="ko">{error}</p>;
  if (!lesson) return <p className={dialogueStyles.note} lang="ko">불러오는 중…</p>;
  return <RolePlayBody key={lesson.lessonId} lesson={lesson} examples={lesson.drills.map((d) => d.en)} />;
}

// 레슨 STEP 4와 Gemini가 만든 새 상황(levelCode가 null, /roleplay/custom)이 같은 화면을 쓴다
export type RolePlayView = RolePlaySource & { lessonTitle: string; level: string; unit: number };

// 위쪽 막대의 롤플레이 칸: 처음엔 빈 칸, 연습 중엔 지나간 줄만큼, 끝나면 꽉 (대화문과 같은 규칙)
function rolePlayFill(phase: Phase, cur: number, total: number): number {
  if (phase === 'done') return 1;
  return phase === 'practice' ? cur / total : 0;
}

// examples = 시작 화면 예문 팝업에 보일 드릴 영어 문장 (새 상황은 드릴이 없어 빈 목록)
export function RolePlayBody({ lesson, examples = [] }: { lesson: RolePlayView; examples?: string[] }) {
  const nav = useNavigate();
  const s = useRolePlaySession(lesson);
  const rp = lesson.rolePlay;
  const code = lesson.levelCode;
  // 끝 화면 전에 완료 화면을 한 번. 네 단계를 다 끝냈으면 레슨 완료로 (사용자 요청 2026-11-19)
  const celebrate = useCelebration(s.phase === 'done');
  return (
    <div className={dialogueStyles.page}>
      <RolePlayTop lessonId={code === null ? null : lesson.lessonId} fill={rolePlayFill(s.phase, s.cur, rp.lines.length)} />
      {s.phase !== 'practice' && <RolePlayHead lesson={lesson} />}
      {s.phase === 'intro' && <RolePlayIntro situation={rp.situation} examples={examples} locked={s.micLocked} note={s.engineNote} onStart={() => s.start(0)} />}
      {s.phase === 'practice' && <RolePlayPractice rp={rp} s={s} />}
      {s.notice && <p className={`${dialogueStyles.result} ${dialogueStyles.fail}`} lang="ko">{s.notice}</p>}
      {s.phase === 'done' && <RolePlayLines lines={rp.lines} partnerRole={rp.partnerRole} said={s.said} />}
      {s.phase === 'done' && code !== null && <DoneActions result={s.result} onAgain={() => s.start(0)}
        onStep={(step) => nav(newStagePath(lesson.lessonId, step))}
        onCourses={() => nav(`/courses?level=${encodeURIComponent(code)}&unit=${lesson.unit}`)} onHome={() => nav('/')} />}
      {s.phase === 'done' && code === null && <CustomDoneActions onAgain={() => s.start(0)}
        onList={() => nav('/roleplay')} onHome={() => nav('/')} />}
      {celebrate.show && <RolePlayComplete result={s.result} onClose={celebrate.close} />}
    </div>
  );
}

// 처음·끝 화면 위: 레슨 제목(작게) + "약사 ↔ ME · 6 LINES" (대화문 처음 화면과 같은 모양)
function RolePlayHead({ lesson }: { lesson: RolePlayView }) {
  const rp = lesson.rolePlay;
  return (
    <header className={dialogueStyles.head}>
      <p className={dialogueStyles.title} lang="ko">{lesson.lessonTitle}</p>
      <span className={dialogueStyles.label}><span lang="ko">{rp.partnerRole}</span> ↔ ME · {rp.lines.length} Lines</span>
    </header>
  );
}

function RolePlayComplete({ result, onClose }: { result: StepResult | null; onClose: () => void }) {
  return result?.done
    ? <StepComplete title="Lesson Complete!" onClose={onClose} />
    : <StepComplete title="Role-play Complete!" onClose={onClose} />;
}
