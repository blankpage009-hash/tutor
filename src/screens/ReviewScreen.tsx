import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { RunTopBar } from '../components/RunTopBar';
import { ScreenHeader } from '../components/ScreenHeader';
import type { SavedSentence } from '../db/types';
import type { ReviewMode } from '../reviewPlan';
import styles from './review/Review.module.css';
import { ReviewCard } from './review/ReviewCard';
import { ReviewResult } from './review/ReviewResult';
import { useReviewQueue } from './review/useReviewQueue';
import { useReviewRun } from './review/useReviewRun';

function ReviewRun({ rows, onContinue }: { rows: SavedSentence[]; onContinue: () => void }) {
  const run = useReviewRun(rows);
  if (run.finished) {
    return <ReviewResult graded={run.state.graded} sentences={run.sentences} recordError={run.recordError} onContinue={onContinue} />;
  }
  return run.sentence && <ReviewCard sentence={run.sentence} state={run.state} speaking={run.speaking} dispatch={run.dispatch} />;
}

function Empty({ mode }: { mode: ReviewMode }) {
  const nav = useNavigate();
  return (
    <>
      <p className={styles.note} lang="ko">
        {mode === 'due' ? '오늘 복습할 문장이 없어요. 저장한 문장은 저장한 다음 날부터 복습에 나와요.' : '복습할 저장 문장이 없어요.'}
      </p>
      <div className={styles.pair}>
        {mode === 'due' && <Button variant="primary" onClick={() => nav('/review?mode=random')}>Random</Button>}
        <Button onClick={() => nav('/library')}>Library</Button>
      </div>
    </>
  );
}

// 한국어를 보고 영어로 말하는 복습. /review = 오늘 때가 된 문장, /review?mode=random = 무작위
export function ReviewScreen() {
  const [params] = useSearchParams();
  const mode: ReviewMode = params.get('mode') === 'random' ? 'random' : 'due';
  const [round, setRound] = useState(0);
  const { rows, error } = useReviewQueue(mode, round);
  if (rows && rows.length > 0) {
    return <ReviewRun key={`${mode}-${round}`} rows={rows} onContinue={() => setRound((r) => r + 1)} />;
  }
  return (
    <div className={styles.stack}>
      <RunTopBar closeTo="/" closeLabel="복습 닫고 홈으로" />
      <ScreenHeader eyebrow={mode === 'random' ? 'RANDOM' : 'TODAY'} title="Review" />
      {error && <p className={styles.note} lang="ko">{error}</p>}
      {!rows && !error && <p className={styles.note} lang="ko">불러오는 중…</p>}
      {rows?.length === 0 && <Empty mode={mode} />}
    </div>
  );
}
