import { useCallback, useEffect, useState } from 'react';
import { countDueWords } from '../../db/srs';
import type { VocabWord } from '../../db/types';
import { listWords, removeWord, updateWord } from '../../db/vocab';

export function useVocab() {
  const [words, setWords] = useState<VocabWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listWords().then((list) => alive && setWords(list), (e) => alive && setError(`단어장을 못 읽었어요: ${String(e)}`));
    return () => { alive = false; };
  }, []);

  const remove = useCallback(async (id: number) => {
    try {
      await removeWord(id);
      setWords((prev) => prev && prev.filter((w) => w.id !== id));
    } catch (e) {
      setError(`삭제하지 못했어요: ${String(e)}`);
    }
  }, []);

  const edit = useCallback(async (id: number, fields: Pick<VocabWord, 'meaning' | 'pos'>) => {
    try {
      await updateWord(id, fields);
      setWords((prev) => prev && prev.map((w) => (w.id === id ? { ...w, ...fields } : w)));
      return true;
    } catch (e) {
      setError(`고치지 못했어요: ${String(e)}`);
      return false;
    }
  }, []);

  return { words, error, remove, edit };
}

// 홈 "오늘 복습할 단어 N개". null = 세는 중(또는 읽기 실패)
export function useDueWordCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    countDueWords(Date.now()).then((n) => alive && setCount(n), () => alive && setCount(null));
    return () => { alive = false; };
  }, []);
  return count;
}
