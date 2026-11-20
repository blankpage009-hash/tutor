import { useMemo, useReducer, type ReactNode } from 'react';
import { Button } from '../../../components/Button';
import { IconCheck, IconClose, IconRepeat } from '../../../components/icons/icons';
import { RunTopBar } from '../../../components/RunTopBar';
import type { VocabWord } from '../../../db/types';
import { posEnglish, posLabel } from '../../../posLabels';
import type { GradedCard } from '../../../reviewPlan';
import { cardReducer, cardsFinished, initCards } from '../../../vocabQuiz';
import reviewStyles from '../../review/Review.module.css';
import styles from './Quiz.module.css';
import { QuizResult } from './QuizResult';
import { useRecordedGrades } from './useRecordedGrades';

type Props = { words: VocabWord[]; tabs: ReactNode; onContinue: () => void };

// 카드 뒤집기: 영어 단어 → 카드를 눌러 뜻 확인 → Didn't Know(모름) · Knew It(좋음) 둘 중 하나 (사용자 결정: 시안대로 2개)
export function CardQuiz({ words, tabs, onContinue }: Props) {
  const [state, dispatch] = useReducer(cardReducer, words, (ws) => initCards(ws.map((w) => String(w.id))));
  const recordError = useRecordedGrades(state.graded);
  const byId = useMemo(() => new Map(words.map((w) => [String(w.id), w])), [words]);
  if (cardsFinished(state)) {
    const label = (g: GradedCard) => byId.get(g.id)?.word ?? g.id;
    return <QuizResult graded={state.graded} label={label} recordError={recordError} tabs={tabs} onContinue={onContinue} />;
  }
  const word = byId.get(state.ids[state.index])!;
  const total = state.ids.length;
  return (
    <div className={reviewStyles.stage}>
      <RunTopBar closeTo="/vocab" closeLabel="퀴즈 닫고 단어장으로" value={(state.index + 1) / total} count={`${state.index + 1}/${total}`} />
      {tabs}
      {/* 카드 전체가 뒤집기 버튼. 한 번 뒤집으면 등급을 고를 때까지 뒷면 그대로 */}
      <button key={word.id} type="button" className={`${reviewStyles.card} ${styles.flipCard}`} aria-disabled={state.flipped}
        aria-label={state.flipped ? undefined : `${word.word}, 눌러서 뜻 보기`} onClick={() => dispatch({ type: 'flip' })}>
        <span className={styles.cardTop}><span className={reviewStyles.labelMuted} lang="en">{state.flipped ? 'MEANING' : 'WORD'}</span></span>
        {state.flipped ? <Back word={word} /> : (
          <span className={styles.face}>
            <span className={styles.bigWord} lang="en">{word.word}</span>
            <span className={styles.posLong} lang="en">{posEnglish(word.pos)}</span>
          </span>
        )}
        {!state.flipped && <span className={styles.flipHint}><IconRepeat /><span className={reviewStyles.labelMuted} lang="en">TAP TO FLIP</span></span>}
      </button>
      <div className={reviewStyles.pair}>
        <Button disabled={!state.flipped} onClick={() => dispatch({ type: 'grade', grade: 'again' })}><IconClose />Didn&apos;t Know</Button>
        <Button variant="primary" disabled={!state.flipped} onClick={() => dispatch({ type: 'grade', grade: 'good' })}><IconCheck />Knew It</Button>
      </div>
    </div>
  );
}

function Back({ word }: { word: VocabWord }) {
  return (
    <span className={`${styles.face} ${styles.back}`}>
      <span className={styles.meaning} lang="ko">{word.meaning}</span>
      <span className={styles.posLong} lang="ko">{posLabel(word.pos)} · <span lang="en">{word.word}</span></span>
      {word.sourceEn && (
        <span className={styles.source}>
          <span lang="en">{word.sourceEn}</span>
          {word.sourceKo && <span className={styles.sourceKo} lang="ko">{word.sourceKo}</span>}
        </span>
      )}
    </span>
  );
}
