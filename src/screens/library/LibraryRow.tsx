import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCircle, IconPlay, IconTrash } from '../../components/icons/icons';
import { SwipeRow } from '../../components/SwipeRow';
import { contentUrl } from '../../content/loader';
import type { SavedSentence } from '../../db/types';
import type { DueLabel } from '../../dueLabel';
import { playAudio, unlockAudio } from '../../speech/audioPlayer';
import styles from './Library.module.css';

type Props = {
  row: SavedSentence;
  due: DueLabel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (id: string) => void;
  // 길게 눌러 여러 문장 고르기 (사용자 요청 2026-11-20): 고르는 중엔 밀기 대신 누르면 고름/풂
  selecting: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
};

// 저장 문장 한 줄: 영어 · 한글 · 다음 복습 날짜 · 재생. 줄을 누르면 그 문장부터 쉐도잉, 왼쪽으로 밀면 삭제(2번 눌러 확정)
export function LibraryRow({ row, due, open, onOpenChange, onRemove, selecting, selected, onSelect }: Props) {
  const nav = useNavigate();
  const [playError, setPlayError] = useState(false);
  const play = () => {
    if (!row.audio) return;
    unlockAudio();
    setPlayError(false);
    playAudio(contentUrl(row.audio), 1).catch(() => setPlayError(true));
  };
  const ready = Boolean(row.en);
  const tap = () => (selecting ? onSelect(row.id) : nav(`/library/practice/${encodeURIComponent(row.id)}`));
  return (
    <SwipeRow open={open} onOpenChange={onOpenChange} swipeEnabled={!selecting}
      onLongPress={selecting ? undefined : () => onSelect(row.id)}
      shifted={selecting} lead={<IconCircle checked={selected} />}
      actions={[{ key: 'delete', label: 'Delete', confirmLabel: 'Confirm', danger: true, icon: <IconTrash />, onClick: () => onRemove(row.id) }]}>
      <div className={`${styles.card} ${selected ? styles.selected : ''}`}>
        <button type="button" className={styles.main} onClick={tap} disabled={!ready && !selecting}
          aria-pressed={selecting ? selected : undefined}>
          <span className={styles.en} lang="en">{row.en || '문장을 찾는 중…'}</span>
          {row.ko && <span className={styles.ko} lang="ko">{row.ko}</span>}
          {due && <span className={`${styles.tag} ${due.today ? styles.tagToday : ''}`} lang="en">{due.text}</span>}
          {playError && <span className={styles.error} lang="ko">재생하지 못했어요. 인터넷 연결을 확인해 주세요.</span>}
        </button>
        <button type="button" className={styles.play} onClick={play} disabled={!row.audio} aria-label="문장 듣기"><IconPlay /></button>
      </div>
    </SwipeRow>
  );
}
