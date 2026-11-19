import { useEffect, useState } from 'react';
import { dueWordTimes } from '../../../db/srs';
import type { VocabWord } from '../../../db/types';
import { listWords } from '../../../db/vocab';
import { pickQuizWords, type QuizKind, type QuizScope } from '../../../vocabQuiz';

// 이번 판에 낼 단어를 고른다. round가 바뀌면(이어서 풀기) 다시 고른다 — 방금 푼 단어는 달력이 미뤄서 빠진다
export function useQuizWords(kind: QuizKind, scope: QuizScope, round: number) {
  const [words, setWords] = useState<VocabWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setWords(null);
    (async () => {
      const all = await listWords();
      const dueAt = scope === 'due' ? await dueWordTimes(Date.now()) : new Map<string, number>();
      return pickQuizWords({ kind, scope, words: all, dueAt });
    })().then(
      (picked) => alive && setWords(picked),
      (e) => alive && setError(`단어를 못 읽었어요: ${String(e)}`)
    );
    return () => { alive = false; };
  }, [kind, scope, round]);

  return { words, error };
}
