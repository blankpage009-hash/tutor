import type { NewLesson } from '../../content/lessonTypes';
import { DRILL_MODE_LABEL, doneRepsByDrill, type DrillStep } from '../../drillPlan';
import { NewLessonSteps } from '../newLesson/NewLessonSteps';
import styles from './Drill.module.css';

type Props = { lesson: NewLesson; plan: DrillStep[]; current: DrillStep; cleared: Set<string> };

// iPad 왼쪽 칸(iPhone은 위): 드릴 문장 6개와 끝낸 회차. 보기만 한다 (사용자 결정 2026-11-17).
// 영어는 적지 않는다 — 기억·상황 회차에서 목록이 정답을 보여 주게 되므로
export function DrillList({ lesson, plan, current, cleared }: Props) {
  const done = doneRepsByDrill(plan, cleared);
  const totalReps = lesson.drillStages.reduce((n, s) => n + s.reps.length, 0);
  return (
    <div>
      <p className={styles.eyebrow} lang="ko">유닛 {lesson.unit} · STEP 3 드릴</p>
      <h1 className={styles.title}>{lesson.lessonTitle}</h1>
      <NewLessonSteps lessonId={lesson.lessonId} current="drill" />
      <ol className={styles.stages}>
        {lesson.drillStages.map((s) => (
          <li key={s.mode} className={s === current.stage ? styles.stageNow : styles.stage} lang="ko">
            {DRILL_MODE_LABEL[s.mode]} {s.reps[0]}–{s.reps.at(-1)}
          </li>
        ))}
      </ol>
      <ol className={styles.list}>
        {lesson.drills.map((d) => (
          <li key={d.id} className={styles.row} aria-current={d.id === current.drill.id}>
            <span lang="ko">{d.ko}</span>
            <span className={styles.rowState} lang="ko">{done.get(d.id) ?? 0}/{totalReps}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
