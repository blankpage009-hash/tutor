import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { RunTopBar } from '../../../components/RunTopBar';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { countUnknownWords } from '../../../db/vocab';
import type { GradedCard } from '../../../reviewPlan';
import { isKnownGrade } from '../../../vocabQuiz';
import reviewStyles from '../../review/Review.module.css';

type Props = { graded: GradedCard[]; label: (g: GradedCard) => string; recordError: boolean; tabs: ReactNode; onContinue: () => void };

// 단어 퀴즈 한 판이 끝난 화면: Known/Unknown 요약 + 아직 Unknown인 단어가 있으면 이어서. 탭으로 다른 종류도 바로 시작
export function QuizResult({ graded, label, recordError, tabs, onContinue }: Props) {
  const nav = useNavigate();
  const [remaining, setRemaining] = useState<number | null>(null);
  const known = graded.filter((g) => isKnownGrade(g.grade)).length;

  // 기록이 저장된 뒤의 개수를 보여 주려고 잠깐 뒤에 센다
  useEffect(() => {
    const t = window.setTimeout(() => countUnknownWords().then(setRemaining, () => setRemaining(null)), 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={reviewStyles.stack}>
      <RunTopBar closeTo="/vocab" closeLabel="퀴즈 닫고 단어장으로" value={1} count={`${graded.length}/${graded.length}`} />
      {tabs}
      <ScreenHeader eyebrow={`${graded.length} WORDS`} title="Quiz Done" />
      <div className={reviewStyles.counts} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {[['KNOWN', known], ['UNKNOWN', graded.length - known]].map(([name, n]) => (
          <div key={name} className={reviewStyles.countBox}>
            <span className={reviewStyles.countNum}>{n}</span>
            <span className={reviewStyles.labelMuted} lang="en">{name}</span>
          </div>
        ))}
      </div>
      {recordError && <p className={reviewStyles.note} lang="ko">일부 결과를 저장하지 못했어요.</p>}
      <ul className={reviewStyles.summary}>
        {graded.map((g) => (
          <li key={g.id} className={reviewStyles.summaryRow}>
            <span lang="en">{label(g)}</span>
            <span className={reviewStyles.grade} lang="en">{isKnownGrade(g.grade) ? 'KNOWN' : 'UNKNOWN'}</span>
          </li>
        ))}
      </ul>
      {remaining !== null && remaining > 0 && (
        <>
          <p className={reviewStyles.note} lang="ko">아직 모르는(Unknown) 단어가 {remaining}개 남았어요.</p>
          <Button variant="primary" block onClick={onContinue}>Continue Quiz</Button>
        </>
      )}
      {remaining === 0 && <p className={reviewStyles.note} lang="ko">모든 단어를 알고 있어요(Known)!</p>}
      <div className={reviewStyles.pair}>
        <Button onClick={() => nav('/')}>Home</Button>
        <Button onClick={() => nav('/vocab')}>Vocab</Button>
      </div>
    </div>
  );
}
