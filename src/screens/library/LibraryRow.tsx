import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { contentUrl } from '../../content/loader';
import type { SavedSentence } from '../../db/types';
import { playAudio, unlockAudio } from '../../speech/audioPlayer';
import styles from './Library.module.css';

type Props = { row: SavedSentence; onRemove: (id: string) => void };

// 저장 문장 한 줄: 듣기 · 다시 쉐도잉 · 삭제(한 번 더 확인)
export function LibraryRow({ row, onRemove }: Props) {
  const nav = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [playError, setPlayError] = useState(false);
  const play = () => {
    if (!row.audio) return;
    unlockAudio();
    setPlayError(false);
    playAudio(contentUrl(row.audio), 1).catch(() => setPlayError(true));
  };
  const ready = Boolean(row.en);
  return (
    <li className={styles.item}>
      <p className={styles.en} lang="en">{row.en ?? '문장을 찾는 중…'}</p>
      {row.ko && <p className={styles.ko} lang="ko">{row.ko}</p>}
      <p className={styles.meta} lang="ko">{row.lessonId}</p>
      <div className={styles.actions}>
        <Button size="sm" onClick={play} disabled={!row.audio}>듣기</Button>
        <Button size="sm" variant="primary" disabled={!ready} onClick={() => nav(`/library/practice/${encodeURIComponent(row.id)}`)}>
          다시 쉐도잉
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>삭제</Button>
      </div>
      {playError && <p className={styles.confirm} lang="ko">재생하지 못했어요. 인터넷 연결을 확인해 주세요.</p>}
      {confirming && (
        <div className={styles.confirm} lang="ko">
          <p>보관함에서 지울까요? 복습 달력에서도 같이 빠져요.</p>
          <div className={styles.actions}>
            <Button size="sm" variant="primary" onClick={() => onRemove(row.id)}>삭제</Button>
            <Button size="sm" onClick={() => setConfirming(false)}>취소</Button>
          </div>
        </div>
      )}
    </li>
  );
}
