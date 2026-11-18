import { describe, expect, it } from 'vitest';
import type { Curriculum } from './content/lessonTypes';
import type { LessonProgress } from './db/types';
import { findNewResume, isNewStage, laterNewStage, newStagePath, nextNewStage, NEW_STAGES } from './newLessonFlow';

describe('새 레슨 흐름', () => {
  it('설명 → 대화문 → 드릴 → 롤플레이 → 완료 순서다', () => {
    expect(NEW_STAGES).toEqual(['learn', 'dialogue', 'drill', 'roleplay', 'done']);
    expect(nextNewStage('learn')).toBe('dialogue');
    expect(nextNewStage('dialogue')).toBe('drill');
    expect(nextNewStage('drill')).toBe('roleplay');
    expect(nextNewStage('roleplay')).toBe('done');
    expect(nextNewStage('done')).toBe('done');
  });

  it('진도는 더 멀리 간 단계를 남긴다', () => {
    expect(laterNewStage(undefined, 'learn')).toBe('learn');
    expect(laterNewStage('learn', 'drill')).toBe('drill');
    expect(laterNewStage('roleplay', 'learn')).toBe('roleplay');
    expect(laterNewStage('done', 'learn')).toBe('done');
  });

  it('기존 수업 단계 이름은 없던 것으로 친다', () => {
    expect(isNewStage('shadowing')).toBe(false);
    expect(laterNewStage('review', 'learn')).toBe('learn');
  });

  it('단계 주소: 끝낸 레슨은 설명부터', () => {
    expect(newStagePath('INT1-U03-L03', 'drill')).toBe('/n/INT1-U03-L03/drill');
    expect(newStagePath('INT1-U03-L03', 'done')).toBe('/n/INT1-U03-L03/learn');
  });
});

const lesson = (no: number, id: string | null, ready = true) => ({ no, title: `레슨 ${no}`, id, ready });
const curriculum: Curriculum = {
  schemaVersion: 1,
  courses: [{
    name: '중급',
    levels: [{
      key: 'INT1', code: 'INT1', name: '중급 1',
      units: [
        { no: 1, title: '유닛 1', lessons: [lesson(1, 'INT1-U01-L01'), lesson(2, 'INT1-U01-L02'), lesson(3, 'INT1-U01-L03', false)] },
        { no: 2, title: '유닛 2', lessons: [lesson(1, null, false)] }
      ]
    }]
  }]
};
const row = (lessonId: string, stage: LessonProgress['stage'], updatedAt: number): LessonProgress =>
  ({ lessonId, courseId: 'INT1', stage, updatedAt });
const map = (...rows: LessonProgress[]) => new Map(rows.map((r) => [r.lessonId, r]));

describe('홈 이어서 할 새 레슨', () => {
  it('진도가 없으면 첫 레슨의 설명부터', () => {
    expect(findNewResume(curriculum, map())).toEqual({ id: 'INT1-U01-L01', stage: 'learn', title: '레슨 1', level: '중급 1' });
  });

  it('하던 레슨 중 가장 최근 것', () => {
    const r = findNewResume(curriculum, map(row('INT1-U01-L01', 'drill', 1), row('INT1-U01-L02', 'dialogue', 2)));
    expect(r).toMatchObject({ id: 'INT1-U01-L02', stage: 'dialogue' });
  });

  it('끝낸 레슨은 건너뛰고, 준비 안 된 레슨은 고르지 않는다', () => {
    expect(findNewResume(curriculum, map(row('INT1-U01-L01', 'done', 5)))).toMatchObject({ id: 'INT1-U01-L02', stage: 'learn' });
    expect(findNewResume(curriculum, map(row('INT1-U01-L01', 'done', 1), row('INT1-U01-L02', 'done', 2)))).toBeNull();
  });
});
