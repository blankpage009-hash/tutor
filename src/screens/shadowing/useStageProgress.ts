import { useEffect } from 'react';
import { markStage } from '../../db/progress';
import { STAGE_OF_KIND, stageAfter, type PracticeKind } from '../../lessonFlow';

// 단계에 들어가면 그 단계를, 끝까지 마치면 다음 단계를 진도로 남긴다.
// 저장이 실패해도 연습은 계속할 수 있어야 하므로 오류는 삼킨다
export function useStageProgress(lessonId: string, courseId: string | null, kind: PracticeKind, finished: boolean) {
  useEffect(() => {
    if (courseId) markStage(lessonId, courseId, STAGE_OF_KIND[kind]).catch(() => undefined);
  }, [lessonId, courseId, kind]);
  useEffect(() => {
    if (courseId && finished) markStage(lessonId, courseId, stageAfter(kind)).catch(() => undefined);
  }, [lessonId, courseId, kind, finished]);
}
