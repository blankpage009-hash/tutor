import { segmentWords } from '../../wordTap';
import tapStyles from '../../components/wordPicker/TapText.module.css';
import { useIsSaved, usePickWord, type WordSource } from '../../components/wordPicker/WordPicker';
import styles from './Learn.module.css';

type Props = { text: string; source: WordSource };

// 원고의 강세 표기(MORnings work BEST)에서 두 글자 이상 대문자 덩어리만 강조한다.
// 한 글자 대문자(I, 문장 첫 글자)는 강세 표시가 아니라서 그대로 둔다
function Stressed({ text }: { text: string }) {
  const parts = text.split(/([A-Z]{2,})/);
  return <>{parts.map((p, i) => (i % 2 ? <b key={i} className={styles.strong}>{p}</b> : p))}</>;
}

// 강세 문장을 보여 주면서 단어 누르기(단어장 저장)도 그대로 되게 한다.
// 저장할 때 단어는 소문자로 바뀌므로(normalizeWord) MORnings를 눌러도 mornings로 저장된다
export function StressText({ text, source }: Props) {
  const pick = usePickWord();
  const isSaved = useIsSaved();
  return (
    <>
      {segmentWords(text).map((s, i) => {
        if (!s.word) return <span key={i}>{s.text}</span>;
        if (!pick) return <Stressed key={i} text={s.text} />;
        return (
          <button key={i} type="button" className={isSaved(s.text) ? `${tapStyles.word} ${tapStyles.saved}` : tapStyles.word} onClick={() => pick(s.text, source)}>
            <Stressed text={s.text} />
          </button>
        );
      })}
    </>
  );
}
