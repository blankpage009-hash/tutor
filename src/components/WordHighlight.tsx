import type { WordMark } from '../scoring/types';
import styles from './WordHighlight.module.css';

type Props = {
  words: WordMark[];
  nextIndex: number;
  // true면 판정이 끝난 상태: 못 맞힌 단어를 "틀림"으로 보여준다. false(듣는 중)면 아직 말할 차례일 뿐이다
  final: boolean;
  lang?: string;
};

// handoff.md WordHighlight: 기본 · 다음 단어(밑줄) · 맞힘(파란 칩) · 틀림(주황 물결 밑줄)
export function WordHighlight({ words, nextIndex, final, lang = 'en' }: Props) {
  return (
    <p className={styles.sentence} lang={lang}>
      {words.map((w, i) => {
        let cls = styles.word;
        if (w.status === 'matched') cls += ` ${styles.matched}`;
        else if (final) cls += ` ${styles.wrong}`;
        else if (i === nextIndex) cls += ` ${styles.next}`;
        return (
          <span key={i}>
            <span className={cls}>{w.text}</span>{' '}
          </span>
        );
      })}
    </p>
  );
}
