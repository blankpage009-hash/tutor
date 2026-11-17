import { useCallback, useMemo } from 'react';
import { contentUrl } from '../../content/loader';
import type { Sentence } from '../../content/types';
import { promptAudio, toSentence, type DrillStep } from '../../drillPlan';
import { playAudio } from '../../speech/audioPlayer';
import { SLOW_RATE, useNewSpeaking } from '../newLesson/useNewSpeaking';
import { useHandsFree } from '../shadowing/useHandsFree';
import type { useDrillSteps } from './useDrillSteps';

type Steps = ReturnType<typeof useDrillSteps>;

// 드릴 말하기는 재생 버튼(손 안 대고 이어 말하기) 하나로 한다 (사용자 요청 2026-11-17).
// 1~2번 틀리면 소리 없이 다시, 3번 연속 틀리면 정답을 0.75배로 들려주고 멈추지 않고 계속 (handsFreeLoop)
export function useDrillSpeaking(plan: DrillStep[], steps: Steps) {
  const sentences = useMemo(() => plan.map(toSentence), [plan]);
  const byId = useMemo(() => new Map(plan.map((s) => [s.stepId, s])), [plan]);
  const step = plan[steps.index];
  const sp = useNewSpeaking(sentences[steps.index] ?? null, {
    threshold: (step?.stage.passScore ?? 80) / 100, failFeedback: false, onResult: () => undefined
  });
  const { log } = sp;

  // 따라 회차는 정답, 상황 응답은 영어 cue를 먼저 틀고, 나머지는 바로 듣는다
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
