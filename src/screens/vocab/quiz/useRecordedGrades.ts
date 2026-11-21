import { useEffect, useRef, useState } from 'react';
import { logActivity } from '../../../db/activity';
import { setWordKnown } from '../../../db/vocab';
import type { GradedCard } from '../../../reviewPlan';
import { isKnownGrade } from '../../../vocabQuiz';

// 새로 끝난 카드만 Known/Unknown으로 기록한다. recorded가 몇 개까지 기록했는지 세어 두어 같은 카드가 두 번 반영되지 않게 한다
// (카드 id = 단어 번호)
export function useRecordedGrades(graded: GradedCard[]): boolean {
  const [recordError, setRecordError] = useState(false);
  const recorded = useRef(0);
  useEffect(() => {
    while (recorded.current < graded.length) {
      const g = graded[recorded.current];
      recorded.current += 1;
      setWordKnown(Number(g.id), isKnownGrade(g.grade)).then(() => logActivity('review'), () => setRecordError(true));
    }
  }, [graded]);
  return recordError;
}
