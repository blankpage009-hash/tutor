import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { RunTopBar } from '../../../components/RunTopBar';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { countDueWords } from '../../../db/srs';
import type { GradedCard } from '../../../reviewPlan';
import reviewStyles from '../../review/Review.module.css';
import { GRADE_LABEL, GradeCounts } from '../../review/ReviewResult';

type Props = { graded: GradedCard[]; label: (g: GradedCard) => string; recordError: boolean; tabs: ReactNode; onContinue: () => void };

// 단어 퀴즈 한 판이 끝난 화면: 결과 요약 + 오늘 남은 복습 단어가 있으면 이어서. 탭으로 다른 종류도 바로 시작
export function QuizResult({ graded, label, recordError, tabs, onContinue }: Props) {
  const nav = useNavigate();
  const [remaining, setRemaining] = useState<number | null>(null);

  // 복습 기록이 달력에 들어간 뒤의 개수를 보여 주려고 잠깐 뒤에 센다
  useEffect(() => {
    const t = window.setTimeout(() => countDueWords(Date.now()).then(setRemaining, () => setRemaining(null)), 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={reviewStyles.stack}>
      <RunTopBar closeTo="/vocab" closeLabel="퀴즈 닫고 단어장으로" value={1} count={`${graded.length}/${graded.length}`} />
      {tabs}
      <ScreenHeader eyebrow={`${graded.length} WORDS`} title="Quiz Done" />
      <GradeCounts graded={graded} />
      {recordError && <p className={reviewStyles.note} lang="ko">일부 결과를 복습 달력에 저장하지 못했어요.</p>}
      <ul className={reviewStyles.summary}>
        {graded.map((g) => (
          <li key={g.id} className={reviewStyles.summaryRow}>
            <span lang="en">{label(g)}</span>
            <span className={reviewStyles.grade} lang="en">{GRADE_LABEL[g.grade]}</span>
          </li>
        ))}
      </ul>
      {remaining !== null && remaining > 0 && (
        <>
          <p className={reviewStyles.note} lang="ko">오늘 복습할 단어가 {remaining}개 더 남았어요.</p>
          <Button variant="primary" block onClick={onContinue}>Continue Quiz</Button>
        </>
      )}
      {remaining === 0 && <p className={reviewStyles.note} lang="ko">오늘 복습할 단어를 다 마쳤어요!</p>}
      <div className={reviewStyles.pair}>
        <Button onClick={() => nav('/')}>Home</Button>
        <Button onClick={() => nav('/vocab')}>Vocab</Button>
      </div>
    </div>
  );
}
