import { segmentWords } from '../wordTap';
import type { WordMark } from '../scoring/types';
import styles from './WordHighlight.module.css';
import tapStyles from './wordPicker/TapText.module.css';
import { useIsSaved } from './wordPicker/WordPicker';

type Props = {
  words: WordMark[];
  nextIndex: number;
  // true면 판정이 끝난 상태: 못 맞힌 단어를 "틀림"으로 보여준다. false(듣는 중)면 아직 말할 차례일 뿐이다
  final: boolean;
  lang?: string;
  // 주면 단어를 눌러 단어장에 저장할 수 있다. 듣는 중에는 화면 쪽이 주지 않는다 (말하다 잘못 눌리지 않게)
  onWordTap?: (word: string) => void;
};

// 눌러서 저장할 단어(문장부호를 뺀 글자)를 버튼으로, 나머지는 그대로 보여 준다
function TapWord({ text, onTap }: { text: string; onTap: (word: string) => void }) {
  const isSaved = useIsSaved();
  return (
    <>
      {segmentWords(text).map((s, i) => (s.word
        ? <button key={i} type="button" className={isSaved(s.text) ? `${tapStyles.word} ${tapStyles.saved}` : tapStyles.word} onClick={() => onTap(s.text)}>{s.text}</button>
        : <span key={i}>{s.text}</span>))}
    </>
  );
}

// handoff.md WordHighlight: 기본 · 다음 단어(밑줄) · 맞힘(파란 칩) · 틀림(주황 물결 밑줄)
export function WordHighlight({ words, nextIndex, final, lang = 'en', onWordTap }: Props) {
  return (
    <p className={styles.sentence} lang={lang}>
      {words.map((w, i) => {
        let cls = styles.word;
        if (w.status === 'matched') cls += ` ${styles.matched}`;
        else if (final) cls += ` ${styles.wrong}`;
        else if (i === nextIndex) cls += ` ${styles.next}`;
        return (
          <span key={i}>
            <span className={cls}>{onWordTap ? <TapWord text={w.text} onTap={onWordTap} /> : w.text}</span>{' '}
          </span>
        );
      })}
    </p>
  );
}
