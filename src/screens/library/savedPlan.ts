import type { DrillStage } from '../../content/lessonTypes';
import type { SavedSentence } from '../../db/types';
import type { DrillStep } from '../../drillPlan';
import { toSavedLesson } from './savedLesson';

// 보관함 연습을 코스 드릴 카드 화면에 태우려고, 저장한 문장을 "한 바퀴짜리 드릴 계획"으로 바꾼다.
// 말하기·카드 화면을 새로 만들지 않으려는 것이라, 문장마다 1회차(따라 말하기)만 둔다
export function toSavedPlan(rows: SavedSentence[], startId: string, passThreshold: number): DrillStep[] | null {
  const lesson = toSavedLesson(rows, startId);
  if (!lesson) return null;
  // 모든 카드가 같은 단계 객체를 써야 위쪽 진행 바가 한 칸으로 합쳐진다 (drillPlan.stageSegments)
  const stage: DrillStage = {
    reps: [1], mode: 'repeat', show: 'en+ko', playAudio: true, passScore: Math.round(passThreshold * 100)
  };
  return lesson.sentences.map((s, i) => {
    // 음성 경로가 없던 옛 저장 문장은 빈 문자열로 두고, 재생 쪽(promptAudio)이 "없음"으로 읽는다
    const audio = s.audio ?? '';
    return {
      stepId: `saved-${s.id}`,
      saveId: s.id,
      drill: {
        id: i + 1, en: s.en, ko: s.ko, point: '',
        cue: { lang: 'en', text: '' },
        audio: { normal: audio, slow: audio }
      },
      rep: 1,
      stage
    };
  });
}
