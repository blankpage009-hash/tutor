import { useMemo, useReducer, type ReactNode } from 'react';
import { Button } from '../../../components/Button';
import { IconCheck, IconClose } from '../../../components/icons/icons';
import { RunTopBar } from '../../../components/RunTopBar';
import type { VocabWord } from '../../../db/types';
import type { GradedCard } from '../../../reviewPlan';
import { cardReducer, cardsFinished, initCards } from '../../../vocabQuiz';
import reviewStyles from '../../review/Review.module.css';
import { CardFace } from './CardFace';
import { QuizResult } from './QuizResult';
import { useRecordedGrades } from './useRecordedGrades';

type Props = { words: VocabWord[]; tabs: ReactNode; onContinue: () => void };

// 카드 뒤집기: 영어 단어(발음 자동 재생) → 탭하면 뜻, 다시 탭하면 단어 → Didn't Know(모름) · Knew It(좋음). 버튼 대신 좌우 스와이프도 가능
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
      <CardFace key={word.id} word={word} flipped={state.flipped}
        onFlip={() => dispatch({ type: 'flip' })} onGrade={(grade) => dispatch({ type: 'grade', grade })} />
      <div className={reviewStyles.pair}>
        <Button onClick={() => dispatch({ type: 'grade', grade: 'again' })}><IconClose />Don&apos;t Know</Button>
        <Button variant="primary" onClick={() => dispatch({ type: 'grade', grade: 'good' })}><IconCheck />Know</Button>
      </div>
    </div>
  );
}
