import type { VocabWord } from '../../../db/types';
import { QuizResult } from './QuizResult';
import { TypeQuizCard } from './TypeQuizCard';
import { useTypeQuizRun, type TypeKind } from './useTypeQuizRun';

// 뜻 → 영어 / 문장 빈칸 한 판: 끝날 때까지 카드를 하나씩, 끝나면 결과
export function TypeQuiz({ words, kind, onContinue }: { words: VocabWord[]; kind: TypeKind; onContinue: () => void }) {
  const run = useTypeQuizRun(words, kind);
  if (run.finished) {
    const byId = new Map(words.map((w) => [String(w.id), w.word]));
    return <QuizResult graded={run.state.graded} label={(g) => byId.get(g.id) ?? g.id} recordError={run.recordError} onContinue={onContinue} />;
  }
  return run.word && (
    <TypeQuizCard key={run.word.id} word={run.word} kind={kind} state={run.state} speaking={run.speaking}
      dispatch={run.dispatch} onSubmit={run.submitTyped} />
  );
}
