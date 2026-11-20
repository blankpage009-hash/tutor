import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBook, IconChat, IconCheck, IconPlay, IconRepeat, IconUsers } from '../../components/icons/icons';
import {
  NEW_STEPS, NEW_STEP_ENGLISH, newStagePath, stepTileState, type NewLessonStep
} from '../../newLessonFlow';
import styles from './LessonView.module.css';

const STEP_ICON: Record<NewLessonStep, ComponentType> = {
  learn: IconBook,
  dialogue: IconChat,
  drill: IconRepeat,
  roleplay: IconUsers
};

type Props = { lessonId: string; focus: NewLessonStep | null; steps: NewLessonStep[] };

// 2×2 단계 타일: 끝낸 단계는 ✓, 다음 단계는 파랑 채움 + ▶. 아무 타일이나 눌러 그 단계로 간다 (앞 단계를 안 끝내도 됨)
export function LessonTiles({ lessonId, focus, steps }: Props) {
  const nav = useNavigate();
  return (
    <div className={styles.tiles}>
      {NEW_STEPS.map((step, i) => {
        // focus가 없으면(다 끝냄) 'current'가 나올 일이 없어 모든 타일이 끝낸 모양이 된다
        const state = stepTileState(step, focus ?? 'done', steps);
        const Icon = STEP_ICON[step];
        return (
          <button key={step} type="button" className={`${styles.tile} ${styles[state]}`}
            aria-current={state === 'current' ? 'step' : undefined}
            onClick={() => nav(newStagePath(lessonId, step))}>
            <span className={styles.tileTop}>
              <span className={styles.tileIcon}><Icon /></span>
              {state === 'done' && <span className={styles.tileMark}><IconCheck /></span>}
              {state === 'current' && <span className={`${styles.tileMark} ${styles.play}`}><IconPlay /></span>}
            </span>
            <span className={styles.tileText}>
              <span className={styles.tileNo}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.tileName}>{NEW_STEP_ENGLISH[step]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
