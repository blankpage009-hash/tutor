import { useState } from 'react';
import type { SavedSentence } from '../../db/types';
import styles from './Prompt.module.css';

type Props = {
  saved: SavedSentence[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  extra: string;
  onExtra: (text: string) => void;
};

// 보관함 문장은 눌러 켜고 끄는 칩, 직접 쓰는 문장은 '+ Add'를 눌러 입력칸을 연다.
// 저장한 문장이 많으면 화면이 너무 길어져서 전체를 기본 닫힘으로 둔다
export function SentencePicker({ saved, selected, onToggle, extra, onExtra }: Props) {
  // 이미 적은 내용이 있으면 닫혀 있어서 안 보이는 일이 없도록 열어 둔다
  const [listOpen, setListOpen] = useState(false);
  const [open, setOpen] = useState(extra.trim() !== '');
  const extraCount = extra.split('\n').filter((l) => l.trim() !== '').length;
  return (
    <div className={styles.field}>
      <button type="button" className={styles.toggle} aria-expanded={listOpen}
        onClick={() => setListOpen((o) => !o)}>
        <span className={styles.label}>MUST USE · {selected.size + extraCount}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      {listOpen && (
        <>
          <div className={styles.chips}>
            {saved.map((s) => (
              <button key={s.id} type="button" className={styles.chip} aria-pressed={selected.has(s.id)}
                onClick={() => onToggle(s.id)}>
                <span className={styles.chipMark} aria-hidden="true">{selected.has(s.id) ? '✓' : ''}</span>
                {s.en}
              </button>
            ))}
            <button type="button" className={`${styles.chip} ${styles.chipAdd}`} aria-expanded={open}
              onClick={() => setOpen((o) => !o)}>
              + Add
            </button>
          </div>
          {saved.length === 0 && <p className={styles.hint} lang="ko">보관함에 저장한 문장이 아직 없어요. + Add로 직접 적어도 돼요.</p>}
          {open && (
            <textarea className={styles.textarea} rows={3} value={extra} onChange={(e) => onExtra(e.target.value)}
              aria-label="직접 적은 문장 (한 줄에 하나)" placeholder="Can I get a latte? (한 줄에 하나)" />
          )}
        </>
      )}
    </div>
  );
}
