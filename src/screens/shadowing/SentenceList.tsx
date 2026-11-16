import type { Lesson } from '../../content/types';
import styles from './Shadowing.module.css';

type Props = { lesson: Lesson; index: number; passed: Set<string>; onPick: (i: number) => void };

// iPad 왼쪽 칸(iPhone에선 위쪽): 수업의 문장 목록과 끝남 · 지금 · 남음 표시
export function SentenceList({ lesson, index, passed, onPick }: Props) {
  return (
    <div>
      <p className={styles.eyebrow}>{lesson.id.toUpperCase()}</p>
      <h1 className={styles.lessonTitle} lang="en">{lesson.title}</h1>
      <p className={styles.ko} lang="ko">{lesson.titleKo}</p>
      <ol className={styles.list}>
        {lesson.sentences.map((s, i) => {
          const state = passed.has(s.id) ? '끝남' : i === index ? '지금' : '남음';
          // 아직 안 지난 문장으로 건너뛰지 못하게 한다 (통과 전에는 다음 문장으로 넘어가지 않음, PLAN 5.3)
          const reachable = i === 0 || passed.has(lesson.sentences[i - 1].id);
          return (
            <li key={s.id}>
              <button type="button" className={styles.row} aria-current={i === index}
                disabled={!reachable} onClick={() => onPick(i)}>
                <span lang="en">{s.en}</span>
                <span className={styles.rowState} lang="ko">{state}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
