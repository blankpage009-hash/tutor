import { Button } from '../../components/Button';
import type { NewLesson } from '../../content/lessonTypes';
import { NewLessonSteps } from '../newLesson/NewLessonSteps';
import styles from './Drill.module.css';

type Props = { lesson: NewLesson; resume: boolean; onStart: () => void };

// 드릴 첫 화면: 연습할 문장 6개만 보여 주고, 시작 버튼을 눌러야 카드 화면이 나온다 (사용자 요청 2026-11-19).
// 영어를 여기서 보여 줘도 되는 이유: 기억·상황 회차의 "정답 가리기"는 카드 화면에서만 필요하다
export function DrillList({ lesson, resume, onStart }: Props) {
  return (
    <div className={styles.start}>
      <p className={styles.eyebrow} lang="ko">유닛 {lesson.unit} · STEP 3 드릴</p>
      <h1 className={styles.title}>{lesson.lessonTitle}</h1>
      <NewLessonSteps lessonId={lesson.lessonId} current="drill" />
      <ol className={styles.list}>
        {lesson.drills.map((d) => (
          <li key={d.id} className={styles.sentenceRow}>
            <span className={styles.en} lang="en">{d.en}</span>
            <span className={styles.koSmall} lang="ko">{d.ko}</span>
          </li>
        ))}
      </ol>
      <Button variant="primary" block onClick={onStart}>{resume ? '이어서 하기' : '드릴 시작'}</Button>
    </div>
  );
}
