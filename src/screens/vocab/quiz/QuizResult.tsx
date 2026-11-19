import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { countDueWords } from '../../../db/srs';
import { gradeCounts, type GradedCard } from '../../../reviewPlan';
import type { Grade } from '../../../srs';
import reviewStyles from '../../review/Review.module.css';

const GRADE_TEXT: Record<Grade, string> = { good: '좋음', hard: '어려움', again: '모름', easy: '쉬움' };

type Props = { graded: GradedCard[]; label: (g: GradedCard) => string; recordError: boolean; onContinue: () => void };

// 단어 퀴즈 한 판이 끝난 화면: 결과 요약 + 오늘 남은 복습 단어가 있으면 이어서
export function QuizResult({ graded, label, recordError, onContinue }: Props) {
  const nav = useNavigate();
  const [remaining, setRemaining] = useState<number | null>(null);
  const counts = gradeCounts(graded);

  // 복습 기록이 달력에 들어간 뒤의 개수를 보여 주려고 잠깐 뒤에 센다
  useEffect(() => {
    const t = window.setTimeout(() => countDueWords(Date.now()).then(setRemaining, () => setRemaining(null)), 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={reviewStyles.stage}>
      <p className={reviewStyles.ko} lang="ko">단어 퀴즈를 마쳤어요!</p>
      <p className={reviewStyles.line} lang="ko">좋음 {counts.good} · 어려움 {counts.hard} · 모름 {counts.again}</p>
      {recordError && <p className={reviewStyles.note} lang="ko">일부 결과를 복습 달력에 저장하지 못했어요.</p>}
      <ul className={reviewStyles.summary}>
        {graded.map((g) => (
          <li key={g.id} className={reviewStyles.summaryRow}>
            <span lang="en">{label(g)}</span>
            <span className={reviewStyles.grade} lang="ko">{GRADE_TEXT[g.grade]}</span>
          </li>
        ))}
      </ul>
      {remaining !== null && remaining > 0 && (
        <>
          <p className={reviewStyles.note} lang="ko">오늘 복습할 단어가 {remaining}개 더 남았어요.</p>
          <Button variant="primary" block onClick={onContinue}>이어서 풀기</Button>
        </>
      )}
      {remaining === 0 && <p className={reviewStyles.note} lang="ko">오늘 복습할 단어를 다 마쳤어요!</p>}
      <div className={reviewStyles.actions}>
        <Button onClick={() => nav('/')}>홈으로</Button>
        <Button variant="ghost" onClick={() => nav('/vocab')}>단어장으로</Button>
      </div>
    </div>
  );
}
