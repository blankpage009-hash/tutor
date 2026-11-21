import { useEffect, useState } from 'react';
import type { VocabWord } from '../../../db/types';
import { listWords } from '../../../db/vocab';
import { pickQuizWords, type QuizKind, type QuizScope } from '../../../vocabQuiz';

// 이번 판에 낼 단어를 고른다. round가 바뀌면(이어서 풀기) 다시 고른다 — 방금 맞힌 단어는 Known이 되어 Unknown 판에서 빠진다
export function useQuizWords(kind: QuizKind, scope: QuizScope, round: number) {
  const [words, setWords] = useState<VocabWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setWords(null);
    listWords().then(
      (all) => alive && setWords(pickQuizWords({ kind, scope, words: all })),
      (e) => alive && setError(`단어를 못 읽었어요: ${String(e)}`)
    );
    return () => { alive = false; };
  }, [kind, scope, round]);

  return { words, error };
}
