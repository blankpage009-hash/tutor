import { Link } from 'react-router-dom';
import type { CurriculumLesson } from '../../content/lessonTypes';
import type { ProgressMap } from '../../lessonFlow';
import { isNewStage, NEW_STAGE_LABEL, newStagePath } from '../../newLessonFlow';
import courseStyles from '../courses/Courses.module.css';
import styles from './Curriculum.module.css';

type Props = { lesson: CurriculumLesson; progress: ProgressMap };

// 레슨 한 줄. 만든 레슨은 진행 중이던 단계로 바로 이어 들어가고, 안 만든 레슨은 회색으로 누를 수 없다
export function LessonRow({ lesson, progress }: Props) {
  const title = <span className={courseStyles.name} lang="ko">{lesson.no}. {lesson.title}</span>;
  if (!lesson.ready || !lesson.id) {
    return (
      <li className={`${courseStyles.row} ${styles.disabled}`} aria-disabled="true">
        <div className={courseStyles.rowHead}>{title}<span className={styles.badge} lang="ko">준비 중</span></div>
      </li>
    );
  }
  const stored = progress.get(lesson.id)?.stage;
  const stage = isNewStage(stored) ? stored : undefined;
  return (
    <li>
      <Link to={newStagePath(lesson.id, stage ?? 'learn')} className={courseStyles.row}>
        <div className={courseStyles.rowHead}>
          {title}
          {stage && <span className={styles.badge} lang="ko">{stage === 'done' ? '완료' : `${NEW_STAGE_LABEL[stage]} 중`}</span>}
        </div>
      </Link>
    </li>
  );
}
