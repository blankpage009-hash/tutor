import { useCallback, useMemo, useRef } from 'react';
import { bumpMiss, halveMiss } from '../../db/savedSentences';
import type { DrillStep } from '../../drillPlan';
import type { HearStatus } from '../shadowing/handsFreeLoop';

// 보관함 연습 한 판 동안의 판정을 틀림 점수로 남긴다 (사용자 요청 2026-11-21).
// 틀리면 그 문장은 판마다 한 번만 +1, 끝까지 한 번도 안 틀리고 그 문장의 마지막 카드를 통과하면 반으로.
// 말이 없음·오류·건너뛰기는 판정이 아니라서 세지 않는다
// 점수 저장이 실패해도 연습은 그대로 이어 가야 하므로 오류는 조용히 넘긴다
export function useMissTracker(plan: DrillStep[]) {
  const byStep = useMemo(() => new Map(plan.map((s) => [s.stepId, s])), [plan]);
  // 같은 문장이 한 판에 두 번 나오면 두 번째 묶음의 마지막 카드에서 판단한다
  const lastStep = useMemo(() => new Map(plan.map((s) => [s.saveId, s.stepId])), [plan]);
  const missed = useRef(new Set<string>());

  return useCallback((stepId: string, r: HearStatus) => {
    const step = byStep.get(stepId);
    const id = step?.saveId;
    if (!id) return;
    const fail = () => undefined;
    if (r === 'failed' && !missed.current.has(id)) {
      missed.current.add(id);
      bumpMiss(id).catch(fail);
    } else if (r === 'passed' && lastStep.get(id) === stepId && !missed.current.has(id)) {
      halveMiss(id).catch(fail);
    }
  }, [byStep, lastStep]);
}
