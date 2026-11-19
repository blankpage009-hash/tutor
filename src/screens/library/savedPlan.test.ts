import { describe, expect, it } from 'vitest';
import type { SavedSentence } from '../../db/types';
import { promptAudio, stageSegments } from '../../drillPlan';
import { toSavedPlan } from './savedPlan';

const row = (id: string, en?: string, audio = ''): SavedSentence => ({ id, courseId: 'c', lessonId: 'l', savedAt: 0, en, ko: en && '뜻', audio });

describe('보관함 연습 드릴 계획', () => {
  const rows = [row('a', 'A', 'audio/a.m4a'), row('b', 'B'), row('c', 'C')];

  it('고른 문장부터 한 장씩, 카드 id는 서로 다르다', () => {
    const plan = toSavedPlan(rows, 'b', 0.8);
    expect(plan?.map((s) => s.saveId)).toEqual(['b', 'c', 'a']);
    expect(new Set(plan?.map((s) => s.stepId)).size).toBe(3);
  });

  it('통과 기준은 설정(0~1)을 백분율로 바꾼다', () => {
    expect(toSavedPlan(rows, 'all', 0.8)?.[0].stage.passScore).toBe(80);
  });

  it('진행 바는 한 칸이다', () => {
    const plan = toSavedPlan(rows, 'all', 0.8) ?? [];
    expect(stageSegments(plan, 1)).toHaveLength(1);
  });

  it('음성이 있으면 먼저 들려주고, 없으면 없음', () => {
    const plan = toSavedPlan(rows, 'all', 0.8) ?? [];
    expect(promptAudio(plan[0])).toBe('audio/a.m4a');
    expect(promptAudio(plan[1])).toBeNull();
  });

  it('연습할 문장이 없으면 null', () => {
    expect(toSavedPlan([row('a')], 'all', 0.8)).toBeNull();
  });
});
