import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Sentence } from '../../content/types';
import { recordSentenceReview } from '../../db/srs';
import { DEFAULT_SETTINGS, type SavedSentence } from '../../db/types';
import { initReview, isFinished, reviewReducer } from '../../reviewPlan';
import { useNewSpeaking } from '../newLesson/useNewSpeaking';

function toSentence(r: SavedSentence): Sentence {
  return { id: r.id, en: r.en ?? '', ko: r.ko ?? '', note: '', hintWords: [], vocab: [], variations: [], audio: r.audio || undefined };
}

// 복습 한 판: 카드 진행(reducer) + 말하기 + 끝낸 카드의 등급을 복습 달력에 기록
export function useReviewRun(rows: SavedSentence[]) {
  const sentences = useMemo(() => rows.map(toSentence), [rows]);
  const [state, dispatch] = useReducer(reviewReducer, rows, (r) => initReview(r.map((x) => x.id)));
  const [recordError, setRecordError] = useState(false);
  const recorded = useRef(0);

  // 판정 콜백은 마이크를 누른 때의 값을 들고 있어서, 상태를 읽지 않고 reducer에 사건만 넘긴다 (reducer가 늦은 판정을 버린다)
  const speaking = useNewSpeaking(sentences[state.index] ?? null, {
    threshold: DEFAULT_SETTINGS.passThreshold, failFeedback: false,
    onResult: (id, status) => {
      if (status === 'passed' || status === 'failed') dispatch({ type: 'attempt', id, status });
    }
  });

  // 새로 끝난 카드만 기록한다. recorded가 몇 개까지 기록했는지 세어 두어, 같은 카드가 두 번 반영되지 않게 한다
  useEffect(() => {
    while (recorded.current < state.graded.length) {
      const g = state.graded[recorded.current];
      recorded.current += 1;
      recordSentenceReview(g.id, g.grade).catch(() => setRecordError(true));
    }
  }, [state.graded]);

  return { state, dispatch, sentence: sentences[state.index] ?? null, sentences, finished: isFinished(state), speaking, recordError };
}
