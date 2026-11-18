import { useNavigate } from 'react-router-dom';
import { SegmentedControl } from '../../components/SegmentedControl';
import { NEW_STAGE_LABEL, newStagePath, type NewLessonStage } from '../../newLessonFlow';
import styles from './NewLessonSteps.module.css';

type Step = Exclude<NewLessonStage, 'done'>;

const STEPS: Step[] = ['learn', 'dialogue', 'drill', 'roleplay'];
const OPTIONS = STEPS.map((s) => ({ value: s, label: NEW_STAGE_LABEL[s] }));

// 레슨 안 단계 버튼: 앞 단계를 다 끝내지 않아도 아무 단계로나 바로 간다 (사용자 요청 2026-11-18)
export function NewLessonSteps({ lessonId, current }: { lessonId: string; current: Step }) {
  const nav = useNavigate();
  return (
    <div className={styles.wrap}>
      <SegmentedControl label="레슨 단계" options={OPTIONS} value={current}
        onChange={(s) => { if (s !== current) nav(newStagePath(lessonId, s)); }} />
    </div>
  );
}
