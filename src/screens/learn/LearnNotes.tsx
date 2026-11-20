import { IconCheck } from '../../components/icons/icons';
import type { NewLesson } from '../../content/lessonTypes';
import styles from './Learn.module.css';

type Props = { lesson: NewLesson };

const pad2 = (n: number) => String(n).padStart(2, '0');

// STEP 1의 읽을거리: 번호 붙은 설명 · 발음 · COMMON MISTAKE.
// 발음 팁은 시안에 없지만 기존 내용은 지우지 않고 모양만 바꾼다 (PLAN 7.95 기본값)
export function LearnNotes({ lesson }: Props) {
  const { explanation, pronunciation, commonMistakes } = lesson;
  return (
    <>
      {/* 원고의 영어 설명(explanation.en·enKo)은 사용자 요청(2026-11-17)으로 화면에 보이지 않는다. 데이터는 그대로 둔다 */}
      <ol className={styles.points}>
        {explanation.ko.map((t, i) => (
          <li key={t} className={styles.point}>
            <span className={styles.no}>{pad2(i + 1)}</span>
            <p className={styles.text} lang="ko">{t}</p>
          </li>
        ))}
      </ol>
      <section className={styles.box}>
        <span className={styles.label}>Pronunciation</span>
        <ul className={styles.items}>
          {pronunciation.map((p) => (
            <li key={p.focus}>
              <span className={styles.focus} lang="ko">{p.focus}</span>
              <p className={styles.text} lang="ko">{p.tip}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.box}>
        <span className={styles.label}>Common Mistake</span>
        <ul className={styles.items}>
          {commonMistakes.map((m) => (
            <li key={m.wrong} className={styles.mistake}>
              <p className={styles.wrong} lang="en">{m.wrong}</p>
              <p className={styles.right} lang="en"><IconCheck />{m.right}</p>
              <p className={styles.why} lang="ko">{m.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
