import { useState } from 'react';
import { Button } from '../../components/Button';
import type { VocabWord } from '../../db/types';
import { POS_OPTIONS, posLabel } from '../../posLabels';
import styles from '../library/Library.module.css';
import vocabStyles from './Vocab.module.css';

type Props = {
  word: VocabWord;
  onRemove: (id: number) => void;
  onEdit: (id: number, fields: Pick<VocabWord, 'meaning' | 'pos'>) => Promise<boolean>;
};

// 단어 한 줄: 단어 · 품사 · 뜻 · 출처 문장, 수정(뜻·품사)과 삭제(한 번 더 확인)
export function VocabRow({ word, onRemove, onEdit }: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view');
  const [meaning, setMeaning] = useState(word.meaning);
  const [pos, setPos] = useState(word.pos);
  const id = word.id!;
  const startEdit = () => { setMeaning(word.meaning); setPos(word.pos); setMode('edit'); };
  const save = async () => {
    if (await onEdit(id, { meaning: meaning.trim(), pos })) setMode('view');
  };
  return (
    <li className={styles.item}>
      <p className={vocabStyles.word} lang="en">{word.word} <span className={vocabStyles.pos} lang="ko">{posLabel(word.pos)}</span></p>
      {mode !== 'edit' && <p className={styles.ko} lang="ko">{word.meaning}</p>}
      {word.sourceEn && <p className={vocabStyles.source} lang="en">{word.sourceEn}</p>}
      {mode === 'edit' && (
        <div className={vocabStyles.form}>
          <input className={vocabStyles.input} lang="ko" value={meaning} onChange={(e) => setMeaning(e.target.value)}
            aria-label="뜻" placeholder="뜻" autoComplete="off" />
          <select className={vocabStyles.input} lang="ko" value={pos} onChange={(e) => setPos(e.target.value)} aria-label="품사">
            {POS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className={styles.actions}>
            <Button size="sm" variant="primary" disabled={!meaning.trim()} onClick={save}>저장</Button>
            <Button size="sm" onClick={() => setMode('view')}>취소</Button>
          </div>
        </div>
      )}
      {mode === 'view' && (
        <div className={styles.actions}>
          <Button size="sm" onClick={startEdit}>뜻 고치기</Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('confirm')}>삭제</Button>
        </div>
      )}
      {mode === 'confirm' && (
        <div className={styles.confirm} lang="ko">
          <p>단어장에서 지울까요? 복습 달력에서도 같이 빠져요.</p>
          <div className={styles.actions}>
            <Button size="sm" variant="primary" onClick={() => onRemove(id)}>삭제</Button>
            <Button size="sm" onClick={() => setMode('view')}>취소</Button>
          </div>
        </div>
      )}
    </li>
  );
}
