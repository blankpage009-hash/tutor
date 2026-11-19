import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { IconCheck } from '../../components/icons/icons';
import { NEW_STEPS, NEW_STEP_ENGLISH, newStagePath, stepTileState, type NewResume } from '../../newLessonFlow';
import styles from './ResumeCard.module.css';

const pad2 = (n: number) => String(n).padStart(2, '0');

// 이어 할 레슨 카드: 레벨·유닛·레슨 번호, 제목, 4단계 타일, 이어 하기 버튼
function ResumeBody({ r }: { r: NewResume }) {
  const navigate = useNavigate();
  const current = r.stage === 'done' ? 'learn' : r.stage;
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.where}>{r.level} · UNIT {r.unitNo}</span>
        <span className={styles.lessonNo}>L{pad2(r.lessonNo)}</span>
      </div>
      <h2 className={styles.title} lang="ko">{r.title}</h2>
      <p className={styles.unit} lang="ko">{r.unitTitle}</p>
      <ol className={styles.steps}>
        {NEW_STEPS.map((step, i) => {
          const state = stepTileState(step, current, r.steps);
          return (
            <li key={step} className={`${styles.tile} ${styles[state]}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className={styles.tileNo}>{state === 'done' ? <IconCheck /> : pad2(i + 1)}</span>
              <span className={styles.tileName}>{NEW_STEP_ENGLISH[step]}</span>
            </li>
          );
        })}
      </ol>
      <Button variant="primary" block onClick={() => navigate(newStagePath(r.id, current))}>
        {r.started ? 'Continue' : 'Start'} {NEW_STEP_ENGLISH[current]}
      </Button>
    </div>
  );
}

// undefined = 불러오는 중, null = 이어 할 레슨 없음
export function ResumeCard({ resume }: { resume: NewResume | null | undefined }) {
  if (resume === undefined) return <p className={styles.note} lang="ko">불러오는 중…</p>;
  if (resume === null) {
    return (
      <p className={styles.note} lang="ko">
        이어 할 수업이 없어요. <Link to="/courses">코스 전체 보기</Link>
      </p>
    );
  }
  return <ResumeBody r={resume} />;
}
