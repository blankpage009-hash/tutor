import { useEffect, useState } from 'react';
import { dueSentenceTimes } from '../../db/srs';
import type { SavedSentence } from '../../db/types';
import { pickReviewRows, type ReviewMode } from '../../reviewPlan';
import { fillMissing, loadRows } from '../library/useLibrary';

// 이번에 복습할 문장들을 고른다. round가 바뀌면(이어서 복습) 다시 고른다 — 방금 푼 문장은 달력이 미뤄서 빠진다
export function useReviewQueue(mode: ReviewMode, round: number) {
  const [rows, setRows] = useState<SavedSentence[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    (async () => {
      const all = await fillMissing(await loadRows());
      const dueAt = mode === 'due' ? await dueSentenceTimes(Date.now()) : new Map<string, number>();
      return pickReviewRows({ mode, rows: all, dueAt });
    })().then(
      (picked) => alive && setRows(picked),
      (e) => alive && setError(`복습할 문장을 못 읽었어요: ${String(e)}`)
    );
    return () => { alive = false; };
  }, [mode, round]);

  return { rows, error };
}
