import { useCallback, useEffect, useMemo, useRef } from 'react';
import { contentUrl } from '../../content/loader';
import type { Sentence } from '../../content/types';
import { promptAudio, toSentence, type DrillStep } from '../../drillPlan';
import { playAudio } from '../../speech/audioPlayer';
import { SLOW_RATE, useNewSpeaking } from '../newLesson/useNewSpeaking';
import { useHandsFree } from '../shadowing/useHandsFree';
import type { AttemptStatus } from '../shadowing/useShadowingAttempt';
import type { useDrillSteps } from './useDrillSteps';

// 같은 회차 3번 연속 실패면 정답을 느리게 들려준다 (PLAN Phase 5.5, 레슨 JSON retryRule과 같음)
const MAX_FAILS = 3;

type Steps = ReturnType<typeof useDrillSteps>;

// 손으로 누를 때의 연속 실패 세기. 3번째에 0.75배로 들려주고 0부터 다시 (멈추지 않음)
function useFailCounter(stepId: string | undefined) {
  const fails = useRef(0);
  useEffect(() => { fails.current = 0; }, [stepId]);
  return fails;
}

// 드릴 말하기: 한 번 듣기(마이크 탭)와 손 안 대고 이어 말하기
export function useDrillSpeaking(plan: DrillStep[], steps: Steps, onPassed: () => void) {
  const sentences = useMemo(() => plan.map(toSentence), [plan]);
  const byId = useMemo(() => new Map(plan.map((s) => [s.stepId, s])), [plan]);
  const step = plan[steps.index];
  const fails = useFailCounter(step?.stepId);
  const attemptRef = useRef<ReturnType<typeof useNewSpeaking>['attempt'] | null>(null);

  const onResult = (id: string, status: AttemptStatus) => {
    if (status === 'passed') {
      fails.current = 0;
      if (steps.recordPass(id)) onPassed();
      return;
    }
    if (status !== 'failed' || (fails.current += 1) < MAX_FAILS) return;
    fails.current = 0;
    const a = attemptRef.current;
    a?.setReplaying(true);
    void a?.playTutor(SLOW_RATE).then(() => a.setReplaying(false));
  };
  const sp = useNewSpeaking(sentences[steps.index] ?? null, {
    threshold: (step?.stage.passScore ?? 80) / 100, failFeedback: false, onResult
  });
  attemptRef.current = sp.attempt;
  const { log } = sp;

  // 이어 말하기: 따라 회차는 정답, 상황 응답은 영어 cue를 먼저 틀고, 나머지는 바로 듣는다
  const audioOf = useCallback((s: Sentence) => { const st = byId.get(s.id); return st ? promptAudio(st) : null; }, [byId]);
  const hf = useHandsFree({
    lesson: { sentences }, index: steps.index, cleared: steps.cleared, recordPass: steps.recordPass, next: steps.next,
    attempt: sp.attempt, active: sp.handsFreeActive, slowRate: SLOW_RATE, failFeedback: false,
    micProcessing: true, log, onTooManyFails: 'slow-and-continue',
    shouldRead: (s) => audioOf(s) !== null,
    readFirst: (s) => {
      const a = audioOf(s);
      return a ? playAudio(contentUrl(a), 1).catch((e) => log(`재생 실패: ${String(e)}`)) : Promise.resolve();
    }
  });
  return { ...sp, hf, step };
}
