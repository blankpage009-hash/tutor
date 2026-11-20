import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { newLessonMenuPath, newStagePath, NEW_STEPS, NEW_STEP_ENGLISH, stepBarFill, type NewLessonStep } from '../../newLessonFlow';
import { useLessonProgress } from './useLessonProgress';
import { IconClose } from '../../components/icons/icons';
import styles from './LessonStepBar.module.css';

type Props = {
  lessonId: string;
  current: NewLessonStep;
  fill: number; // 지금 단계의 진행(0~1). 화면마다 뜻이 달라 화면이 정해서 준다
};

// 레슨 단계 화면 맨 위: X(레슨 화면으로) + 4칸 단계 막대. 칸을 누르면 그 단계로 바로 간다 —
// 앞 단계를 다 끝내지 않아도 아무 단계로나 가게 해 달라는 요청(2026-11-18)을 막대 모양에서도 지킨다
export function LessonStepBar({ lessonId, current, fill }: Props) {
  const nav = useNavigate();
  const steps = useLessonProgress(lessonId)?.steps ?? [];
  return (
    <div className={styles.bar}>
      <Link to={newLessonMenuPath(lessonId)} className={styles.close} aria-label="레슨 화면으로 닫기"><IconClose /></Link>
      <nav className={styles.steps} aria-label="레슨 단계">
        {NEW_STEPS.map((s) => {
          const on = s === current;
          // 채움 폭은 진행에 따라 바뀌는 값이라 CSS 변수로 넘긴다
          const style = { '--fill': stepBarFill(s, current, steps, fill) } as CSSProperties;
          return (
            <button key={s} type="button" className={`${styles.step} ${on ? styles.on : ''}`}
              aria-current={on ? 'step' : undefined} onClick={() => { if (!on) nav(newStagePath(lessonId, s)); }}>
              <span className={styles.track}><span className={styles.fill} style={style} /></span>
              <span className={styles.name}>{NEW_STEP_ENGLISH[s]}</span>
            </button>
          );
        })}
      </nav>
      {/* 시안처럼 막대가 가운데 오도록 X와 같은 폭을 오른쪽에도 비운다 */}
      <span className={styles.spacer} aria-hidden="true" />
    </div>
  );
}
