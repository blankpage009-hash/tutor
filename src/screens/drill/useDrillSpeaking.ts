import { useCallback, useMemo, useRef } from 'react';
import { contentUrl } from '../../content/loader';
import type { Sentence } from '../../content/types';
import { promptAudio, toSentence, type DrillStep } from '../../drillPlan';
import { playAudio } from '../../speech/audioPlayer';
import { TUTOR_SAFE_MIC } from '../../speech/micSlot';
import { SLOW_RATE, useNewSpeaking } from '../newLesson/useNewSpeaking';
import type { HearStatus } from '../shadowing/handsFreeLoop';
import { useHandsFree } from '../shadowing/useHandsFree';
import type { useDrillSteps } from './useDrillSteps';

type Steps = ReturnType<typeof useDrillSteps>;

const LEAD_IN_MS = 1000;

// 드릴 말하기는 재생 버튼(손 안 대고 이어 말하기) 하나로 한다 (사용자 요청 2026-11-17).
// 1~2번 틀리면 소리 없이 다시, 3번 연속 틀리면 정답을 0.75배로 들려주고 멈추지 않고 계속 (handsFreeLoop)
// onHeard: 판정마다 카드 id와 결과를 알려 준다 (보관함 틀림 점수만 씀, 코스 드릴은 넘기지 않음)
export function useDrillSpeaking(plan: DrillStep[], steps: Steps, onHeard?: (stepId: string, r: HearStatus) => void) {
  const sentences = useMemo(() => plan.map(toSentence), [plan]);
  const byId = useMemo(() => new Map(plan.map((s) => [s.stepId, s])), [plan]);
  const step = plan[steps.index];
  const sp = useNewSpeaking(sentences[steps.index] ?? null, {
    threshold: (step?.stage.passScore ?? 80) / 100, failFeedback: false, onResult: () => undefined
  });
  const { log } = sp;

  // 따라 회차는 정답, 상황 응답은 영어 cue를 먼저 틀고, 나머지는 바로 듣는다
  const audioOf = useCallback((s: Sentence) => { const st = byId.get(s.id); return st ? promptAudio(st) : null; }, [byId]);
  // 시작 버튼을 누르자마자 튜터 소리가 나오면 화면을 볼 새가 없다. 시작으로 켠 첫 읽기만 1초 기다린다 (사용자 요청 2026-11-20).
  // 기다리는 동안에도 장치는 이미 만들어졌으므로 iOS 마이크 허락에는 영향이 없다
  const leadIn = useRef(false);
  const armLeadIn = useCallback(() => { leadIn.current = true; }, []);
  const hf = useHandsFree({
    lesson: { sentences }, index: steps.index, cleared: steps.cleared, recordPass: steps.recordPass, next: steps.next,
    attempt: sp.attempt, active: sp.handsFreeActive, slowRate: SLOW_RATE, failFeedback: false,
    ...TUTOR_SAFE_MIC, feedbackSound: true, log, onHeard, onTooManyFails: 'slow-and-continue',
    shouldRead: (s) => audioOf(s) !== null,
    readFirst: async (s) => {
      const a = audioOf(s);
      if (!a) return;
      if (leadIn.current) {
        leadIn.current = false;
        await new Promise((r) => setTimeout(r, LEAD_IN_MS));
      }
      await playAudio(contentUrl(a), 1).catch((e) => log(`재생 실패: ${String(e)}`));
    }
  });
  return { ...sp, hf, step, armLeadIn };
}
