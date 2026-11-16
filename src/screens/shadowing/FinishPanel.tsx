import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { STAGE_LABEL, stageAfter, stagePath, type PracticeKind } from '../../lessonFlow';
import styles from './Shadowing.module.css';

type Props = { kind: PracticeKind; lessonId: string; courseId: string | null; total: number };

// 한 단계를 모두 통과했을 때 다음 단계로 이어 주는 안내. 복습을 끝내면 수업 완료
export function FinishPanel({ kind, lessonId, courseId, total }: Props) {
  const nav = useNavigate();
  const after = stageAfter(kind);
  const done = after === 'done';
  return (
    <>
      <p className={styles.pass} lang="ko">
        {done ? `수업을 마쳤어요! 문장 ${total}개를 다시 확인했어요.` : `문장 ${total}개를 모두 통과했어요!`}
      </p>
      {done ? (
        <Button variant="primary" block onClick={() => nav(courseId ? `/courses/${courseId}` : '/courses')}>
          수업 완료 · 코스로 돌아가기
        </Button>
      ) : (
        <Button variant="primary" block onClick={() => nav(stagePath(lessonId, after))}>
          다음 단계: {STAGE_LABEL[after]}
        </Button>
      )}
    </>
  );
}
