import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../components/Button';
import { IconCheck, IconClose, IconEdit, IconTrash } from '../../components/icons/icons';
import { SwipeRow } from '../../components/SwipeRow';
import type { VocabWord } from '../../db/types';
import { POS_OPTIONS, posLabel, posShort } from '../../posLabels';
import styles from './Vocab.module.css';
import { WordDictSheet } from './WordDictSheet';

type Props = {
  word: VocabWord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leftOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  onSetKnown: (id: number, known: boolean) => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, fields: Pick<VocabWord, 'meaning' | 'pos'>) => Promise<boolean>;
};

// 단어 한 줄 (디자인 v2 10): 단어 · 품사 · 뜻 / 예문. 왼쪽으로 밀면 Edit(뜻·품사 고치기) · Delete(2번 눌러 확정),
// 오른쪽으로 밀면 Known 단어는 Don't Know, Unknown 단어는 Know 버튼
export function VocabRow({ word, open, onOpenChange, leftOpen, onLeftOpenChange, onSetKnown, onRemove, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const id = word.id!;
  const known = !!word.known;
  const leftActions = [known
    ? { key: 'unknown', label: "Don't Know", icon: <IconClose />, onClick: () => onSetKnown(id, false) }
    : { key: 'known', label: 'Know', icon: <IconCheck />, accent: true, onClick: () => onSetKnown(id, true) }];
  const actions = [
    { key: 'edit', label: 'Edit', icon: <IconEdit />, onClick: () => { onOpenChange(false); setEditing(true); } },
    { key: 'delete', label: 'Delete', confirmLabel: 'Confirm', danger: true, icon: <IconTrash />, onClick: () => onRemove(id) }
  ];
  return (
    <>
      <SwipeRow open={open} onOpenChange={onOpenChange} swipeEnabled={!editing} actions={actions}
        leftActions={leftActions} leftOpen={leftOpen} onLeftOpenChange={onLeftOpenChange}>
        {/* 밀기·길게 누르기 뒤의 click은 SwipeRow가 걸러 주므로 여기 오는 건 진짜 "누르기"뿐. 고치는 중엔 입력칸 터치라 열지 않는다 */}
        <div className={styles.card} onClick={() => { if (!editing) setViewing(true); }}>
          <div className={styles.head}>
            <span className={styles.word} lang="en">{word.word}</span>
            <span className={styles.pos} lang="en" title={posLabel(word.pos)}>{posShort(word.pos)}</span>
            {!editing && <span className={styles.meaning} lang="ko">{word.meaning}</span>}
          </div>
          {word.sourceEn && <p className={styles.source} lang="en">{word.sourceEn}</p>}
          {editing && <EditForm word={word} onCancel={() => setEditing(false)}
            onSave={async (fields) => { if (await onEdit(id, fields)) setEditing(false); }} />}
        </div>
      </SwipeRow>
      {/* 카드는 밀릴 때 transform이 걸려 있어 그 안의 고정 위치 창이 카드에 갇힌다. 그래서 body로 빼서 띄운다.
          카드 div 밖(형제)에 둬야 창 안 클릭이 React 트리를 타고 카드 onClick으로 올라가 다시 열리지 않는다 */}
      {viewing && createPortal(<WordDictSheet word={word.word} onClose={() => setViewing(false)} />, document.body)}
    </>
  );
}

type FormProps = { word: VocabWord; onCancel: () => void; onSave: (f: Pick<VocabWord, 'meaning' | 'pos'>) => void };

function EditForm({ word, onCancel, onSave }: FormProps) {
  const [meaning, setMeaning] = useState(word.meaning);
  const [pos, setPos] = useState(word.pos);
  return (
    <div className={styles.form}>
      <input className={styles.input} lang="ko" value={meaning} onChange={(e) => setMeaning(e.target.value)}
        aria-label="뜻" placeholder="뜻" autoComplete="off" autoFocus />
      <select className={styles.input} lang="ko" value={pos} onChange={(e) => setPos(e.target.value)} aria-label="품사">
        {POS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className={styles.formButtons}>
        <Button size="sm" variant="primary" disabled={!meaning.trim()} onClick={() => onSave({ meaning: meaning.trim(), pos })}>Save</Button>
        <Button size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
