import { Link } from 'react-router-dom';
import type { CurriculumLesson } from '../../content/lessonTypes';
import type { ProgressMap } from '../../lessonFlow';
import { isNewStage, NEW_STAGE_LABEL, NEW_STEPS, newLessonMenuPath } from '../../newLessonFlow';
import courseStyles from '../courses/Courses.module.css';
import styles from './Curriculum.module.css';

type Props = { lesson: CurriculumLesson; progress: ProgressMap };

// 레슨 한 줄. 만든 레슨은 4버튼 메뉴 화면으로 들어가고(단계는 거기서 고른다), 안 만든 레슨은 회색으로 누를 수 없다
export function LessonRow({ lesson, progress }: Props) {
  const title = <span className={courseStyles.name} lang="ko">{lesson.no}. {lesson.title}</span>;
  if (!lesson.ready || !lesson.id) {
    return (
      <li className={`${courseStyles.row} ${styles.disabled}`} aria-disabled="true">
        <div className={courseStyles.rowHead}>{title}<span className={styles.badge} lang="ko">준비 중</span></div>
      </li>
    );
  }
  const row = progress.get(lesson.id);
  const stage = isNewStage(row?.stage) ? row.stage : undefined;
  // 네 단계를 다 끝내야 완료라서 몇 단계를 끝냈는지 같이 보여 준다 (사용자 요청 2026-11-18)
  const badge = stage === 'done' ? '완료' : stage && `${NEW_STAGE_LABEL[stage]} 중 · ${row?.steps?.length ?? 0}/${NEW_STEPS.length}`;
  return (
    <li>
      <Link to={newLessonMenuPath(lesson.id)} className={courseStyles.row}>
        <div className={courseStyles.rowHead}>
          {title}
          {badge && <span className={styles.badge} lang="ko">{badge}</span>}
        </div>
      </Link>
    </li>
  );
}
