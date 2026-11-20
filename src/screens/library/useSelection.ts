import { useCallback, useMemo, useState } from 'react';

// 보관함 "길게 눌러 여러 문장 고르기". 고른 순서가 아니라 보관함 목록 순서로 연습한다 (목록에서 보이는 순서와 같게)
export function useSelection(order: string[]) {
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const toggle = useCallback((id: string) => {
    setPicked((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  // 지워진 문장은 빼고 센다
  const ids = useMemo(() => (picked ? order.filter((id) => picked.has(id)) : []), [order, picked]);
  return {
    selecting: picked !== null,
    ids,
    has: (id: string) => picked?.has(id) ?? false,
    toggle,
    cancel: () => setPicked(null),
    practicePath: () => `/library/practice/selected?${new URLSearchParams(ids.map((id) => ['id', id]))}`
  };
}
