import { useMemo, useReducer } from 'react';
import { Button } from '../../../components/Button';
import { ProgressBar } from '../../../components/ProgressBar';
import type { VocabWord } from '../../../db/types';
import { posLabel } from '../../../posLabels';
import type { GradedCard } from '../../../reviewPlan';
import type { Grade } from '../../../srs';
import { cardReducer, cardsFinished, initCards } from '../../../vocabQuiz';
import reviewStyles from '../../review/Review.module.css';
import styles from './Quiz.module.css';
import { QuizResult } from './QuizResult';
import { useRecordedGrades } from './useRecordedGrades';

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 'again', label: '몰라요' }, { grade: 'hard', label: '애매해요' }, { grade: 'good', label: '알아요' }
];

// 카드 뒤집기: 영어 단어를 보고 → 뒤집어 뜻을 확인 → 스스로 등급을 매긴다 (말하기·쓰기 없음)
export function CardQuiz({ words, onContinue }: { words: VocabWord[]; onContinue: () => void }) {
  const [state, dispatch] = useReducer(cardReducer, words, (ws) => initCards(ws.map((w) => String(w.id))));
  const recordError = useRecordedGrades(state.graded);
  const byId = useMemo(() => new Map(words.map((w) => [String(w.id), w])), [words]);
  if (cardsFinished(state)) {
    const label = (g: GradedCard) => byId.get(g.id)?.word ?? g.id;
    return <QuizResult graded={state.graded} label={label} recordError={recordError} onContinue={onContinue} />;
  }
  const word = byId.get(state.ids[state.index])!;
  return (
    <div className={reviewStyles.stage}>
      <p className={reviewStyles.eyebrow} lang="ko">카드 · 단어 {state.index + 1} / {state.ids.length}</p>
      <ProgressBar value={state.index / state.ids.length} label="퀴즈 진행" />
      <p className={styles.bigWord} lang="en">{word.word}</p>
      {!state.flipped
        ? <Button variant="primary" block onClick={() => dispatch({ type: 'flip' })}>뜻 보기</Button>
        : <Back word={word} onGrade={(grade) => dispatch({ type: 'grade', grade })} />}
    </div>
  );
}

function Back({ word, onGrade }: { word: VocabWord; onGrade: (g: Grade) => void }) {
  return (
    <>
      <p className={reviewStyles.ko} lang="ko">{word.meaning} <span className={styles.pos}>{posLabel(word.pos)}</span></p>
      {word.sourceEn && (
        <div className={styles.source}>
          <p className={reviewStyles.line} lang="en">{word.sourceEn}</p>
          {word.sourceKo && <p className={reviewStyles.note} lang="ko">{word.sourceKo}</p>}
        </div>
      )}
      <p className={reviewStyles.note} lang="ko">얼마나 알고 있었나요?</p>
      <div className={reviewStyles.actions}>
        {GRADES.map((g) => (
          <Button key={g.grade} variant={g.grade === 'good' ? 'primary' : 'secondary'} onClick={() => onGrade(g.grade)}>{g.label}</Button>
        ))}
      </div>
    </>
  );
}
