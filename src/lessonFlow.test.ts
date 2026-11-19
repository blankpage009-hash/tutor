import { describe, expect, it } from 'vitest';
import type { LessonProgress } from './db/types';
import { toProgressMap } from './lessonFlow';

const row = (lessonId: string, stage: LessonProgress['stage']): LessonProgress =>
  ({ lessonId, courseId: 'c', stage, updatedAt: 1 });

describe('진도 지도', () => {
  it('레슨 id로 진도 한 줄을 찾는다', () => {
    const p = toProgressMap([row('a', 'done'), row('b', 'drill')]);
    expect(p.get('a')?.stage).toBe('done');
    expect(p.get('b')?.stage).toBe('drill');
    expect(p.get('c')).toBeUndefined();
  });
});
