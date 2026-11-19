import { useEffect, useState } from 'react';
import { ensureSrsForAllSaved } from '../../db/savedSentences';
import { countDueSentences } from '../../db/srs';

// 홈 "오늘 복습할 문장 N개". null = 세는 중(또는 읽기 실패)
export function useDueCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    ensureSrsForAllSaved()
      .then(() => countDueSentences(Date.now()))
      .then((n) => alive && setCount(n), () => alive && setCount(null));
    return () => { alive = false; };
  }, []);
  return count;
}
