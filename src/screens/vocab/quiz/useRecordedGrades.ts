import { useEffect, useRef, useState } from 'react';
import { recordWordReview } from '../../../db/srs';
import type { GradedCard } from '../../../reviewPlan';

// 새로 끝난 카드만 복습 달력에 기록한다. recorded가 몇 개까지 기록했는지 세어 두어 같은 카드가 두 번 반영되지 않게 한다
// (카드 id = 단어 번호 = 달력의 itemId)
export function useRecordedGrades(graded: GradedCard[]): boolean {
  const [recordError, setRecordError] = useState(false);
  const recorded = useRef(0);
  useEffect(() => {
    while (recorded.current < graded.length) {
      const g = graded[recorded.current];
      recorded.current += 1;
      recordWordReview(g.id, g.grade).catch(() => setRecordError(true));
    }
  }, [graded]);
  return recordError;
}
