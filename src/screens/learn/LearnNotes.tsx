import type { NewLesson } from '../../content/lessonTypes';
import styles from './Learn.module.css';

type Props = { lesson: NewLesson };

// STEP 1의 읽을거리: 설명 · 발음 · 자주 하는 실수
export function LearnNotes({ lesson }: Props) {
  const { explanation, pronunciation, commonMistakes } = lesson;
  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.heading} lang="en">Explanation</h2>
        <ul className={`${styles.bullets} ${styles.text}`} lang="ko">
          {explanation.ko.map((t) => <li key={t}>{t}</li>)}
        </ul>
        {/* 원고의 영어 설명(explanation.en·enKo)은 사용자 요청(2026-11-17)으로 화면에 보이지 않는다. 데이터는 그대로 둔다 */}
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading} lang="ko">발음</h2>
        <ul className={styles.items}>
          {pronunciation.map((p) => (
            <li key={p.focus}>
              <span className={styles.label} lang="ko">{p.focus}</span>
              <p className={styles.text} lang="ko">{p.tip}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading} lang="ko">자주 하는 실수</h2>
        <ul className={styles.items}>
          {commonMistakes.map((m) => (
            <li key={m.wrong}>
              <p className={`${styles.text} ${styles.wrong}`} lang="en">{m.wrong}</p>
              <p className={`${styles.text} ${styles.right}`} lang="en">{m.right}</p>
              <p className={styles.ko} lang="ko">{m.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
