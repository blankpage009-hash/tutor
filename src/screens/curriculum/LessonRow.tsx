import { Link } from 'react-router-dom';
import type { CurriculumLesson } from '../../content/lessonTypes';
import type { ProgressMap } from '../../lessonFlow';
import { isNewStage, NEW_STAGE_LABEL, NEW_STEPS, newLessonMenuPath } from '../../newLessonFlow';
import styles from './UnitRow.module.css';

type Props = { lesson: CurriculumLesson; progress: ProgressMap };

const pad2 = (n: number) => String(n).padStart(2, '0');

// 펼친 유닛 안의 레슨 한 줄. 만든 레슨은 레슨 화면으로 들어가고, 안 만든 레슨은 회색으로 누를 수 없다
export function LessonRow({ lesson, progress }: Props) {
  const head = (
    <>
      <span className={styles.lessonNo}>L{pad2(lesson.no)}</span>
      <span className={styles.lessonTitle} lang="ko">{lesson.title}</span>
    </>
  );
  if (!lesson.ready || !lesson.id) {
    return (
      <li className={`${styles.lesson} ${styles.off}`} aria-disabled="true">
        {head}<span className={styles.lessonBadge} lang="ko">준비 중</span>
      </li>
    );
  }
  const row = progress.get(lesson.id);
  const stage = isNewStage(row?.stage) ? row.stage : undefined;
  // 네 단계를 다 끝내야 완료라서 몇 단계를 끝냈는지 같이 보여 준다 (사용자 요청 2026-11-18)
  const badge = stage === 'done' ? '완료' : stage && `${NEW_STAGE_LABEL[stage]} 중 · ${row?.steps?.length ?? 0}/${NEW_STEPS.length}`;
  return (
    <li>
      <Link to={newLessonMenuPath(lesson.id)} className={styles.lesson}>
        {head}
        {badge && <span className={`${styles.lessonBadge} ${styles.on}`} lang="ko">{badge}</span>}
      </Link>
    </li>
  );
}
