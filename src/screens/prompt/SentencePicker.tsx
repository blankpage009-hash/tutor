import type { SavedSentence } from '../../db/types';
import styles from './Prompt.module.css';

type Props = {
  saved: SavedSentence[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  extra: string;
  onExtra: (text: string) => void;
};

// 보관함에서 고르거나 직접 적는다
export function SentencePicker({ saved, selected, onToggle, extra, onExtra }: Props) {
  return (
    <>
      <div className={styles.field}>
        <span className={styles.label} lang="ko">꼭 써 볼 문장</span>
        {saved.length === 0
          ? <p className={styles.hint} lang="ko">보관함에 저장한 문장이 아직 없어요. 아래에 직접 적어도 돼요.</p>
          : saved.map((s) => (
            <label key={s.id} className={styles.pick}>
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => onToggle(s.id)} />
              <span className={styles.pickEn}>
                {s.en}
                {s.ko && <span className={styles.pickKo} lang="ko">{s.ko}</span>}
              </span>
            </label>
          ))}
      </div>
      <label className={styles.field}>
        <span className={styles.label} lang="ko">직접 적은 문장 (한 줄에 하나)</span>
        <textarea className={styles.textarea} rows={3} value={extra} onChange={(e) => onExtra(e.target.value)}
          placeholder="Can I get a latte?" />
      </label>
    </>
  );
}
