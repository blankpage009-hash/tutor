import { Button } from '../../components/Button';
import { IconChevronRight } from '../../components/icons/icons';
import { NEW_STAGE_LABEL, NEW_STEP_ENGLISH, type NewLessonStep } from '../../newLessonFlow';
import dialogueStyles from '../dialogue/Dialogue.module.css';
import styles from './RolePlay.module.css';
import type { StepResult } from './useRolePlaySession';

type DoneProps = {
  result: StepResult | null;
  onAgain: () => void; onStep: (s: NewLessonStep) => void; onCourses: () => void; onHome: () => void;
};

// 네 단계를 다 끝냈을 때만 레슨 완료. 아니면 남은 단계로 가는 버튼을 먼저 보여 준다 (사용자 요청 2026-11-18).
// 버튼 글자는 디자인대로 영문 (PLAN 7.95 기본값)
export function DoneActions({ result, onAgain, onStep, onCourses, onHome }: DoneProps) {
  const missing = result && !result.done ? result.missing : [];
  return (
    <>
      <p className={`${dialogueStyles.result} ${dialogueStyles.pass}`} lang="ko">
        {missing.length
          ? <>롤플레이를 끝냈어요! 남은 단계: {missing.map((m) => NEW_STAGE_LABEL[m]).join(', ')}</>
          : '레슨 완료! 설명부터 롤플레이까지 모두 끝냈어요.'}
      </p>
      <div className={styles.doneActions}>
        {missing.map((m, i) => (
          <Button key={m} variant={i === 0 ? 'primary' : 'secondary'} block onClick={() => onStep(m)}>
            <IconChevronRight />Go to {NEW_STEP_ENGLISH[m]}
          </Button>
        ))}
        <Button variant={missing.length ? 'secondary' : 'primary'} block onClick={onCourses}>Courses</Button>
        <Button block onClick={onHome}>Home</Button>
        <Button variant="ghost" block onClick={onAgain}>Practice Again</Button>
      </div>
    </>
  );
}

type CustomProps = { onAgain: () => void; onList: () => void; onHome: () => void };

export function CustomDoneActions({ onAgain, onList, onHome }: CustomProps) {
  return (
    <>
      <p className={`${dialogueStyles.result} ${dialogueStyles.pass}`} lang="ko">롤플레이를 끝냈어요! (새 상황은 진도에 기록되지 않아요)</p>
      <div className={styles.doneActions}>
        <Button variant="primary" block onClick={onAgain}>Practice Again</Button>
        <Button block onClick={onList}>Role-play List</Button>
        <Button variant="ghost" block onClick={onHome}>Home</Button>
      </div>
    </>
  );
}
