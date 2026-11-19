import { describe, expect, it } from 'vitest';
import type { Drill, DrillStage } from './content/lessonTypes';
import { buildDrillPlan, doneRepsByDrill, promptAudio, stageSegments, toSentence } from './drillPlan';

const stages: DrillStage[] = [
  { reps: [1, 2, 3], mode: 'repeat', show: 'en+ko', playAudio: true, passScore: 80 },
  { reps: [4, 5, 6], mode: 'read', show: 'en', playAudio: false, passScore: 80 },
  { reps: [7, 8], mode: 'recall', show: 'ko', playAudio: false, passScore: 80 },
  { reps: [9, 10], mode: 'respond', show: 'cue', playAudio: false, passScore: 80 }
];

function drill(id: number, cueAudio = true): Drill {
  return {
    id, en: `en ${id}`, ko: `ko ${id}`, point: 'p',
    cue: cueAudio ? { lang: 'en', text: 'cue', audio: `cue-${id}.m4a` } : { lang: 'ko', text: '상황' },
    audio: { normal: `drill-${id}.m4a`, slow: `drill-${id}.m4a` }
  };
}

const lesson = { lessonId: 'INT1-U01-L01', drills: [1, 2, 3, 4, 5, 6].map((i) => drill(i, i !== 5)), drillStages: stages };

describe('드릴 60회 순서 (바퀴 방식)', () => {
  const plan = buildDrillPlan(lesson);

  it('6문장 × 10회 = 60회', () => {
    expect(plan).toHaveLength(60);
  });

  it('한 바퀴씩 돈다: 1회차 문장1~6 다음 2회차', () => {
    expect(plan.slice(0, 7).map((s) => [s.rep, s.drill.id])).toEqual([
      [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 1]
    ]);
    expect(plan.at(-1)?.rep).toBe(10);
  });

  it('단계: 따라 3 → 보고 3 → 기억 2 → 상황 응답 2', () => {
    const modeAt = (rep: number) => plan.find((s) => s.rep === rep)?.stage.mode;
    expect([3, 4, 6, 7, 8, 9, 10].map(modeAt)).toEqual(['repeat', 'read', 'read', 'recall', 'recall', 'respond', 'respond']);
  });

  it('회차 id는 모두 다르고, 저장 id는 문장 단위다', () => {
    expect(new Set(plan.map((s) => s.stepId)).size).toBe(60);
    expect(plan[0].stepId).toBe('INT1-U01-L01-d1-r1');
    expect(plan[6].saveId).toBe('INT1-U01-L01-d1');
  });

  it('말하기 엔진용 문장은 회차 id와 드릴 음성을 쓴다', () => {
    const s = toSentence(plan[8]);
    expect(s).toMatchObject({ id: 'INT1-U01-L01-d3-r2', en: 'en 3', ko: 'ko 3', audio: 'drill-3.m4a' });
  });

  it('먼저 들려줄 소리: 따라는 정답, 보고·기억은 없음, 상황 응답은 영어 cue만', () => {
    const at = (rep: number, id: number) => plan.find((s) => s.rep === rep && s.drill.id === id)!;
    expect(promptAudio(at(1, 1))).toBe('drill-1.m4a');
    expect(promptAudio(at(4, 1))).toBeNull();
    expect(promptAudio(at(7, 1))).toBeNull();
    expect(promptAudio(at(9, 1))).toBe('cue-1.m4a');
    expect(promptAudio(at(9, 5))).toBeNull(); // 한국어 cue는 소리 없음
  });

  it('진행 바: 단계마다 한 칸, 지금 카드까지 채운다', () => {
    expect(stageSegments(plan, 0).map((s) => s.mode)).toEqual(['repeat', 'read', 'recall', 'respond']);
    expect(stageSegments(plan, 0).map((s) => s.fill)).toEqual([1 / 18, 0, 0, 0]);
    // 인덱스 18 = 4회차 첫 카드 (따라 말하기 18칸을 다 지남)
    expect(stageSegments(plan, 18).map((s) => s.fill)).toEqual([1, 1 / 18, 0, 0]);
    expect(stageSegments(plan, 59).map((s) => s.fill)).toEqual([1, 1, 1, 1]);
  });

  it('문장별로 끝낸 회차 수를 센다', () => {
    const cleared = new Set([plan[0].stepId, plan[6].stepId, plan[1].stepId]);
    const m = doneRepsByDrill(plan, cleared);
    expect(m.get(1)).toBe(2);
    expect(m.get(2)).toBe(1);
    expect(m.get(3)).toBeUndefined();
  });
});
