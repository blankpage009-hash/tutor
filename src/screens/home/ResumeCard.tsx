import type { ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { IconBook, IconChat, IconCheck, IconPlay, IconRepeat, IconUsers } from '../../components/icons/icons';
import {
  NEW_STEPS, NEW_STEP_ENGLISH, newStagePath, stepTileState, type NewLessonStep, type NewResume
} from '../../newLessonFlow';
import styles from './ResumeCard.module.css';

const pad2 = (n: number) => String(n).padStart(2, '0');

// 끝낸 단계는 ✓, 아직인 단계(지금 단계 포함)는 그 단계를 뜻하는 그림 (디자인 v2 시안)
const STEP_ICON: Record<NewLessonStep, ComponentType> = {
  learn: IconBook,
  dialogue: IconChat,
  drill: IconRepeat,
  roleplay: IconUsers
};

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
        {NEW_STEPS.map((step) => {
          const state = stepTileState(step, current, r.steps);
          const Icon = state === 'done' ? IconCheck : STEP_ICON[step];
          return (
            <li key={step} className={`${styles.tile} ${styles[state]}`} aria-current={state === 'current' ? 'step' : undefined}>
              <Icon />
              <span className={styles.tileName}>{NEW_STEP_ENGLISH[step]}</span>
            </li>
          );
        })}
      </ol>
      <Button variant="primary" block className={styles.cta} onClick={() => navigate(newStagePath(r.id, current))}>
        <IconPlay />
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
