import { useCallback, useEffect, useState } from 'react';
import type { VocabWord } from '../../db/types';
import { countUnknownWords, listWords, removeWord, setWordKnown, updateWord } from '../../db/vocab';

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

  const setKnown = useCallback(async (id: number, known: boolean) => {
    try {
      await setWordKnown(id, known);
      setWords((prev) => prev && prev.map((w) => (w.id === id ? { ...w, known } : w)));
    } catch (e) {
      setError(`저장하지 못했어요: ${String(e)}`);
    }
  }, []);

  return { words, error, remove, edit, setKnown };
}

// 홈 "모르는(Unknown) 단어 N개". null = 세는 중(또는 읽기 실패)
export function useUnknownWordCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    countUnknownWords().then((n) => alive && setCount(n), () => alive && setCount(null));
    return () => { alive = false; };
  }, []);
  return count;
}
