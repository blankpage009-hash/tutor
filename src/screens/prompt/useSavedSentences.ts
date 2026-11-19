import { useEffect, useState } from 'react';
import { db } from '../../db/db';
import type { SavedSentence } from '../../db/types';

// 보관함의 예전 문장은 영어 글자가 저장돼 있지 않아 목록에서 뺀다 (SavedSentence.en은 선택 칸)
export function useSavedSentences(): SavedSentence[] {
  const [rows, setRows] = useState<SavedSentence[]>([]);
  useEffect(() => {
    db.savedSentences.orderBy('savedAt').reverse().toArray()
      .then((all) => setRows(all.filter((s) => s.en)), () => undefined);
  }, []);
  return rows;
}
