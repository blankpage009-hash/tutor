import { useCallback, useEffect, useState } from 'react';
import { resolveSavedText } from '../../content/savedText';
import { ensureSrsForAllSaved, fillSavedText, removeSaved } from '../../db/savedSentences';
import { listSrs } from '../../db/srs';
import type { SavedSentence } from '../../db/types';

// 최근에 저장한 문장이 위에 오게 (방금 저장한 것을 바로 찾도록)
export async function loadRows(): Promise<SavedSentence[]> {
  return (await ensureSrsForAllSaved()).reverse();
}

// 글자 없이 저장된 예전 문장은 콘텐츠에서 찾아 채워 넣고(다음부터는 바로 쓰도록 저장), 못 찾으면 그대로 둔다
export async function fillMissing(rows: SavedSentence[]): Promise<SavedSentence[]> {
  return Promise.all(rows.map(async (r) => {
    if (r.en) return r;
    const t = await resolveSavedText(r);
    if (!t) return r;
    await fillSavedText(r.id, t).catch(() => undefined);
    return { ...r, ...t };
  }));
}

export function useLibrary() {
  const [rows, setRows] = useState<SavedSentence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let alive = true;
    // 줄마다 "다음 복습 날짜"를 보여 주려고 문장 복습 달력을 한 번에 읽는다. 못 읽어도 목록은 그대로 보인다
    listSrs('sentence').then((list) => alive && setDueAt(new Map(list.map((s) => [s.itemId, s.dueAt]))), () => undefined);
    loadRows()
      .then((list) => {
        if (alive) setRows(list);
        return fillMissing(list);
      })
      .then((filled) => {
        // 채우는 동안 지운 문장이 되살아나지 않게, 지금 목록에 있는 것만 바꾼다
        const byId = new Map(filled.map((r) => [r.id, r]));
        if (alive) setRows((prev) => prev && prev.map((r) => byId.get(r.id) ?? r));
      })
      .catch((e) => alive && setError(`보관함을 못 읽었어요: ${String(e)}`));
    return () => { alive = false; };
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await removeSaved(id);
      setRows((prev) => prev && prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(`삭제하지 못했어요: ${String(e)}`);
    }
  }, []);

  return { rows, error, remove, dueAt };
}
