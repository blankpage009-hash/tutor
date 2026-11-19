import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import type { Sentence } from '../../content/types';
import { countDueSentences } from '../../db/srs';
import { gradeCounts, type GradedCard } from '../../reviewPlan';
import type { Grade } from '../../srs';
import styles from './Review.module.css';

const GRADE_TEXT: Record<Grade, string> = { good: '좋음', hard: '어려움', again: '모름', easy: '쉬움' };

type Props = { graded: GradedCard[]; sentences: Sentence[]; recordError: boolean; onContinue: () => void };

// 복습 한 판이 끝난 화면: 결과 요약 + 남은 복습이 있으면 이어서
export function ReviewResult({ graded, sentences, recordError, onContinue }: Props) {
  const nav = useNavigate();
  const [remaining, setRemaining] = useState<number | null>(null);
  const counts = gradeCounts(graded);
  const byId = new Map(sentences.map((s) => [s.id, s]));

  // 복습 기록이 달력에 들어간 뒤의 개수를 보여 주려고 잠깐 뒤에 센다
  useEffect(() => {
    const t = window.setTimeout(() => countDueSentences(Date.now()).then(setRemaining, () => setRemaining(null)), 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={styles.stage}>
      <p className={styles.ko} lang="ko">복습을 마쳤어요!</p>
      <p className={styles.line} lang="ko">
        좋음 {counts.good} · 어려움 {counts.hard} · 모름 {counts.again}
      </p>
      {recordError && <p className={styles.note} lang="ko">일부 결과를 복습 달력에 저장하지 못했어요.</p>}
      <ul className={styles.summary}>
        {graded.map((g) => (
          <li key={g.id} className={styles.summaryRow}>
            <span lang="en">{byId.get(g.id)?.en}</span>
            <span className={styles.grade} lang="ko">{GRADE_TEXT[g.grade]}</span>
          </li>
        ))}
      </ul>
      {remaining !== null && remaining > 0 && (
        <>
          <p className={styles.note} lang="ko">오늘 복습할 문장이 {remaining}개 더 남았어요.</p>
          <Button variant="primary" block onClick={onContinue}>이어서 복습</Button>
        </>
      )}
      {remaining === 0 && <p className={styles.note} lang="ko">오늘 복습할 문장을 다 마쳤어요!</p>}
      <div className={styles.actions}>
        <Button onClick={() => nav('/')}>홈으로</Button>
        <Button variant="ghost" onClick={() => nav('/library')}>보관함으로</Button>
      </div>
    </div>
  );
}
