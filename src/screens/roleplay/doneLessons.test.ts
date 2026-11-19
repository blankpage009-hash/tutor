import { describe, expect, it } from 'vitest';
import type { Curriculum } from '../../content/lessonTypes';
import type { LessonProgress } from '../../db/types';
import { doneLessonGroups } from './doneLessons';

const curriculum: Curriculum = {
  schemaVersion: 1,
  courses: [{
    name: '코스',
    levels: [
      { key: 'A', code: 'A', name: '레벨 A', units: [{ no: 1, title: '인사', lessons: [
        { no: 1, title: '첫 인사', id: 'A-1', ready: true, file: 'x' },
        { no: 2, title: '둘째', id: 'A-2', ready: true, file: 'x' },
        { no: 3, title: '준비 중', id: null, ready: false }
      ] }] },
      { key: 'B', code: 'B', name: '레벨 B', units: [{ no: 1, title: '식당', lessons: [
        { no: 1, title: '주문', id: 'B-1', ready: true, file: 'x' }
      ] }] }
    ]
  }]
};

function row(lessonId: string, stage: LessonProgress['stage']): LessonProgress {
  return { lessonId, courseId: 'A', stage, updatedAt: 0 };
}

describe('doneLessonGroups', () => {
  it('끝낸 레슨만 레벨별로 묶고, 끝낸 레슨이 없는 레벨은 뺀다', () => {
    const progress = new Map([['A-1', row('A-1', 'done')], ['A-2', row('A-2', 'dialogue')]]);
    const groups = doneLessonGroups(curriculum, progress);
    expect(groups).toHaveLength(1);
    expect(groups[0].levelKey).toBe('A');
    expect(groups[0].lessons.map((l) => l.id)).toEqual(['A-1']);
  });

  it('진도가 하나도 없으면 빈 목록이다', () => {
    expect(doneLessonGroups(curriculum, new Map())).toEqual([]);
  });
});
