import { Button } from '../../components/Button';
import { IconPlay } from '../../components/icons/icons';
import type { NewLesson } from '../../content/lessonTypes';
import { LessonStepBar } from '../newLesson/LessonStepBar';
import styles from './Drill.module.css';

type Props = {
  lesson: NewLesson;
  fill: number; // 위쪽 단계 막대의 드릴 칸 (지나간 회차 비율)
  resume: boolean;
  onStart: () => void;
  onRestart: () => void;
};

// 드릴 첫 화면: 연습할 문장 6개만 보여 주고, 시작 버튼을 눌러야 카드 화면이 나온다 (사용자 요청 2026-11-19).
// 영어를 여기서 보여 줘도 되는 이유: 기억·상황 회차의 "정답 가리기"는 카드 화면에서만 필요하다
export function DrillList({ lesson, fill, resume, onStart, onRestart }: Props) {
  const rounds = lesson.drillStages.reduce((n, s) => n + s.reps.length, 0);
  return (
    <div className={styles.page}>
      <LessonStepBar lessonId={lesson.lessonId} current="drill" fill={fill} />
      <header className={styles.head}>
        <p className={styles.title} lang="ko">{lesson.lessonTitle}</p>
        <span className={styles.label}>{lesson.drills.length} Sentences · {rounds} Rounds</span>
      </header>
      <ol className={styles.list}>
        {lesson.drills.map((d) => (
          <li key={d.id} className={styles.row}>
            <span className={styles.no}>{String(d.id).padStart(2, '0')}</span>
            <div className={styles.text}>
              <p className={styles.en} lang="en">{d.en}</p>
              <p className={styles.ko} lang="ko">{d.ko}</p>
            </div>
          </li>
        ))}
      </ol>
      {/* 하다 만 기록이 있으면 처음부터/이어서를 고르게 한다 (사용자 요청 2026-11-19, 버튼은 영문) */}
      {resume ? (
        <div className={styles.actions}>
          <Button block onClick={onRestart}>Restart</Button>
          <Button variant="primary" block onClick={onStart}><IconPlay />Continue</Button>
        </div>
      ) : (
        <Button variant="primary" block className={styles.bottom} onClick={onStart}><IconPlay />Start Drill</Button>
      )}
    </div>
  );
}
