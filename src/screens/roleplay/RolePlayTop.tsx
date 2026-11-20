import { Link } from 'react-router-dom';
import { IconClose } from '../../components/icons/icons';
import { LessonStepBar } from '../newLesson/LessonStepBar';
import barStyles from '../newLesson/LessonStepBar.module.css';

type Props = {
  lessonId: string | null; // null = Gemini가 만든 새 상황 (레슨이 아니라 단계 막대가 없다)
  fill: number;
};

// 롤플레이 맨 위: 레슨이면 공통 단계 막대(X → 레슨 화면), 새 상황이면 X(→ 롤플레잉 목록)만
export function RolePlayTop({ lessonId, fill }: Props) {
  if (lessonId !== null) return <LessonStepBar lessonId={lessonId} current="roleplay" fill={fill} />;
  return (
    <div className={barStyles.bar}>
      <Link to="/roleplay" className={barStyles.close} aria-label="롤플레잉 목록으로 닫기"><IconClose /></Link>
    </div>
  );
}
