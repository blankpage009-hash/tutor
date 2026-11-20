import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { RunTopBar } from '../../components/RunTopBar';
import { ScreenHeader } from '../../components/ScreenHeader';
import type { Sentence } from '../../content/types';
import { countDueSentences } from '../../db/srs';
import { gradeCounts, type GradedCard } from '../../reviewPlan';
import type { Grade } from '../../srs';
import styles from './Review.module.css';

export const GRADE_LABEL: Record<Grade, string> = { good: 'GOOD', hard: 'HARD', again: 'AGAIN', easy: 'EASY' };
const SHOWN: Grade[] = ['good', 'hard', 'again'];

// 좋음·어려움·모름 개수 칸 3개 (단어 퀴즈 결과도 같이 쓴다)
export function GradeCounts({ graded }: { graded: GradedCard[] }) {
  const counts = gradeCounts(graded);
  return (
    <div className={styles.counts}>
      {SHOWN.map((g) => (
        <div key={g} className={styles.countBox}>
          <span className={styles.countNum}>{counts[g]}</span>
          <span className={styles.labelMuted} lang="en">{GRADE_LABEL[g]}</span>
        </div>
      ))}
    </div>
  );
}

type Props = { graded: GradedCard[]; sentences: Sentence[]; recordError: boolean; onContinue: () => void };

// 복습 한 판이 끝난 화면: 결과 요약 + 남은 복습이 있으면 이어서
export function ReviewResult({ graded, sentences, recordError, onContinue }: Props) {
  const nav = useNavigate();
  const [remaining, setRemaining] = useState<number | null>(null);
  const byId = new Map(sentences.map((s) => [s.id, s]));

  // 복습 기록이 달력에 들어간 뒤의 개수를 보여 주려고 잠깐 뒤에 센다
  useEffect(() => {
    const t = window.setTimeout(() => countDueSentences(Date.now()).then(setRemaining, () => setRemaining(null)), 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={styles.stack}>
      <RunTopBar closeTo="/" closeLabel="복습 닫고 홈으로" value={1} count={`${graded.length}/${graded.length}`} />
      <ScreenHeader eyebrow={`${graded.length} SENTENCES`} title="Review Done" />
      <GradeCounts graded={graded} />
      {recordError && <p className={styles.note} lang="ko">일부 결과를 복습 달력에 저장하지 못했어요.</p>}
      <ul className={styles.summary}>
        {graded.map((g) => (
          <li key={g.id} className={styles.summaryRow}>
            <span lang="en">{byId.get(g.id)?.en}</span>
            <span className={styles.grade} lang="en">{GRADE_LABEL[g.grade]}</span>
          </li>
        ))}
      </ul>
      {remaining !== null && remaining > 0 && (
        <>
          <p className={styles.note} lang="ko">오늘 복습할 문장이 {remaining}개 더 남았어요.</p>
          <Button variant="primary" block onClick={onContinue}>Continue Review</Button>
        </>
      )}
      {remaining === 0 && <p className={styles.note} lang="ko">오늘 복습할 문장을 다 마쳤어요!</p>}
      <div className={styles.pair}>
        <Button onClick={() => nav('/')}>Home</Button>
        <Button onClick={() => nav('/library')}>Library</Button>
      </div>
    </div>
  );
}
