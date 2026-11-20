import type { CSSProperties } from 'react';
import { IconList } from '../../components/icons/icons';
import { DRILL_MODE_LABEL, stageSegments, type DrillStep } from '../../drillPlan';
import barStyles from '../newLesson/LessonStepBar.module.css';
import styles from './DrillPlayer.module.css';

type Props = { plan: DrillStep[]; index: number; onClose: () => void };

// 드릴 카드 화면 맨 위 (디자인 v2 06): 목록 버튼 + 모드 막대(REPEAT·READ·RECALL·RESPOND).
// 레슨 단계 막대(LessonStepBar)와 같은 모양이라 그 CSS를 함께 쓴다. 단, 칸은 누르는 버튼이 아니다
// (회차 순서대로 도는 드릴이라 모드를 건너뛰는 기능이 없다)
export function DrillModeBar({ plan, index, onClose }: Props) {
  const segs = stageSegments(plan, index);
  const mode = plan[index].stage.mode;
  // 보관함 연습은 모드가 하나뿐이라 칸 수를 계획에 맞춘다
  const grid = { gridTemplateColumns: `repeat(${segs.length}, minmax(0, 1fr))` } as CSSProperties;
  return (
    <div className={barStyles.bar}>
      {/* 앱 공통 X는 레슨을 나가는 버튼이라, 여기서는 목록 모양으로 구분한다 (사용자 요청 2026-11-19) */}
      <button type="button" className={`${barStyles.close} ${styles.listBtn}`} onClick={onClose} aria-label="문장 목록으로">
        <IconList />
      </button>
      <div className={barStyles.steps} style={grid} aria-label="드릴 모드 진행">
        {segs.map((s) => (
          <div key={s.mode} className={`${styles.mode} ${s.mode === mode ? barStyles.on : ''}`}>
            {/* 채움 폭은 진행에 따라 바뀌는 값이라 CSS 변수로 넘긴다 */}
            <span className={barStyles.track}><span className={barStyles.fill} style={{ '--fill': s.fill } as CSSProperties} /></span>
            <span className={barStyles.name}>{DRILL_MODE_LABEL[s.mode]}</span>
          </div>
        ))}
      </div>
      <span className={barStyles.spacer} aria-hidden="true" />
    </div>
  );
}
