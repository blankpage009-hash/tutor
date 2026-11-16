import type { Lesson } from '../../content/types';
import { isReachable } from './lessonSteps';
import styles from './Shadowing.module.css';

type Props = { lesson: Lesson; index: number; cleared: Set<string>; locked: boolean; onPick: (i: number) => void };

// iPad 왼쪽 칸(iPhone에선 위쪽): 수업의 문장 목록과 끝남 · 지금 · 남음 표시
export function SentenceList({ lesson, index, cleared, locked, onPick }: Props) {
  const ids = lesson.sentences.map((s) => s.id);
  return (
    <div>
      <p className={styles.eyebrow}>{lesson.id.toUpperCase()}</p>
      <h1 className={styles.lessonTitle} lang="en">{lesson.title}</h1>
      <p className={styles.ko} lang="ko">{lesson.titleKo}</p>
      <ol className={styles.list}>
        {lesson.sentences.map((s, i) => {
          const state = cleared.has(s.id) ? '끝남' : i === index ? '지금' : '남음';
          // 듣는 중에는 문장을 못 바꾸게 잠근다 (말하는 도중 문장이 바뀌면 판정이 엉뚱한 문장에 붙음)
          return (
            <li key={s.id}>
              <button type="button" className={styles.row} aria-current={i === index}
                disabled={locked || !isReachable(ids, i, cleared)} onClick={() => onPick(i)}>
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
