import { segmentWords } from '../../wordTap';
import styles from './TapText.module.css';
import { useIsSaved, usePickWord, type WordSource } from './WordPicker';

type Props = { text: string; source: WordSource };

// 문장 글자 안의 단어를 눌러 단어장에 저장하게 한다. 감싸는 <p>의 글자 모양은 그대로 따른다
export function TapText({ text, source }: Props) {
  const pick = usePickWord();
  const isSaved = useIsSaved();
  if (!pick) return <>{text}</>;
  return (
    <>
      {segmentWords(text).map((s, i) => (s.word
        ? <button key={i} type="button" className={isSaved(s.text) ? `${styles.word} ${styles.saved}` : styles.word} onClick={() => pick(s.text, source)}>{s.text}</button>
        : <span key={i}>{s.text}</span>))}
    </>
  );
}
