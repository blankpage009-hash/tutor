import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Sentence } from '../../../content/types';
import type { VocabWord } from '../../../db/types';
import { initReview, isFinished, reviewReducer } from '../../../reviewPlan';
import { useSettings } from '../../../settings/SettingsProvider';
import { clozeWordMatched, isTypedCorrect } from '../../../vocabQuiz';
import { useNewSpeaking } from '../../newLesson/useNewSpeaking';
import { useRecordedGrades } from './useRecordedGrades';

export type TypeKind = 'write' | 'cloze';

// 말하기 엔진이 먹는 문장 모양. 뜻→영어는 단어 하나를, 문장 빈칸은 출처 문장 전체를 말한다.
// 단어 음성 파일은 없어서 audio는 비워 둔다 (정답 듣기 버튼도 두지 않는다)
function toSentence(w: VocabWord, kind: TypeKind): Sentence {
  return {
    id: String(w.id), en: kind === 'write' ? w.word : w.sourceEn ?? '', ko: kind === 'write' ? w.meaning : w.sourceKo ?? '',
    note: '', hintWords: [], vocab: [], variations: []
  };
}

// 단어 퀴즈 한 판(뜻→영어 / 문장 빈칸): 카드 진행은 문장 복습의 reducer를 쓰고, 말하기와 쓰기 두 방법으로 답한다
export function useTypeQuizRun(words: VocabWord[], kind: TypeKind) {
  const sentences = useMemo(() => words.map((w) => toSentence(w, kind)), [words, kind]);
  const [state, dispatch] = useReducer(reviewReducer, words, (ws) => initReview(ws.map((w) => String(w.id))));
  const word = words[state.index] ?? null;
  const { settings } = useSettings();
  const speaking = useNewSpeaking(sentences[state.index] ?? null, {
    threshold: settings.passThreshold, failFeedback: false, onResult: () => undefined
  });

  // 판정이 끝난 결과 객체를 한 번만 처리한다. 문장 빈칸은 문장이 통과 기준을 넘어도
  // 빈칸의 그 단어를 못 맞혔으면 틀린 것으로 센다. reducer가 늦게 도착한 판정은 버린다
  const outcome = speaking.attempt.outcome;
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (!outcome || !word || (outcome.status !== 'passed' && outcome.status !== 'failed') || handled.current === outcome) return;
    handled.current = outcome;
    const ok = outcome.status === 'passed' && (kind === 'write' || clozeWordMatched(outcome.judgement.words, word.word));
    dispatch({ type: 'attempt', id: String(word.id), status: ok ? 'passed' : 'failed' });
  }, [outcome, word, kind]);

  const submitTyped = useCallback((text: string) => {
    if (!word) return;
    dispatch({ type: 'attempt', id: String(word.id), status: isTypedCorrect(text, word.word) ? 'passed' : 'failed' });
  }, [word]);

  const recordError = useRecordedGrades(state.graded);
  return { state, dispatch, word, sentences, finished: isFinished(state), speaking, submitTyped, recordError };
}
