import { describe, expect, it } from 'vitest';
import type { Curriculum } from './content/lessonTypes';
import type { LessonProgress } from './db/types';
import {
  addFinishedStep, enteredNewStage, findNewResume, isNewStage, missingSteps, newLessonMenuPath, newStagePath,
  focusStep, nextNewStage, NEW_STAGES, NEW_STEP_ENGLISH, stepTileState
} from './newLessonFlow';

describe('새 레슨 흐름', () => {
  it('설명 → 대화문 → 드릴 → 롤플레이 → 완료 순서다', () => {
    expect(NEW_STAGES).toEqual(['learn', 'dialogue', 'drill', 'roleplay', 'done']);
    expect(nextNewStage('learn')).toBe('dialogue');
    expect(nextNewStage('dialogue')).toBe('drill');
    expect(nextNewStage('drill')).toBe('roleplay');
    expect(nextNewStage('roleplay')).toBe('done');
    expect(nextNewStage('done')).toBe('done');
  });

  it('들어갈 때는 마지막으로 들어간 단계를 남기고, 완료한 레슨은 완료 그대로', () => {
    expect(enteredNewStage(undefined, 'learn')).toBe('learn');
    expect(enteredNewStage('roleplay', 'drill')).toBe('drill');
    expect(enteredNewStage('done', 'learn')).toBe('done');
  });

  it('기존 수업 단계 이름은 없던 것으로 친다', () => {
    expect(isNewStage('shadowing')).toBe(false);
    expect(enteredNewStage('review', 'learn')).toBe('learn');
  });

  it('네 단계를 모두 끝내야 남은 단계가 없다 (순서와 상관없이)', () => {
    let steps = addFinishedStep(undefined, 'roleplay');
    steps = addFinishedStep(steps, 'learn');
    steps = addFinishedStep(steps, 'roleplay');
    expect(steps).toEqual(['learn', 'roleplay']);
    expect(missingSteps(steps)).toEqual(['dialogue', 'drill']);
    steps = addFinishedStep(addFinishedStep(steps, 'drill'), 'dialogue');
    expect(missingSteps(steps)).toEqual([]);
    expect(missingSteps(undefined)).toEqual(['learn', 'dialogue', 'drill', 'roleplay']);
  });

  it('단계 주소: 끝낸 레슨은 설명부터', () => {
    expect(newStagePath('INT1-U03-L03', 'drill')).toBe('/n/INT1-U03-L03/drill');
    expect(newStagePath('INT1-U03-L03', 'done')).toBe('/n/INT1-U03-L03/learn');
  });

  it('레슨 메뉴 주소와 영어 단계 이름', () => {
    expect(newLessonMenuPath('INT1-U03-L03')).toBe('/n/INT1-U03-L03');
    expect(NEW_STEP_ENGLISH.roleplay).toBe('Role-play');
  });

  it('단계 타일: 지금 단계가 우선, 그다음 끝낸 단계, 나머지는 남음', () => {
    expect(stepTileState('learn', 'drill', ['learn'])).toBe('done');
    expect(stepTileState('drill', 'drill', ['learn', 'drill'])).toBe('current');
    expect(stepTileState('roleplay', 'drill', ['learn'])).toBe('todo');
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
    expect(findNewResume(curriculum, map())).toEqual({
      id: 'INT1-U01-L01', stage: 'learn', title: '레슨 1', level: '중급 1',
      unitNo: 1, unitTitle: '유닛 1', lessonNo: 1, steps: [], started: false
    });
  });

  it('하던 레슨은 끝낸 단계와 시작 여부를 함께 돌려준다', () => {
    const r = findNewResume(curriculum, map({ ...row('INT1-U01-L02', 'drill', 3), steps: ['learn', 'dialogue'] }));
    expect(r).toMatchObject({ id: 'INT1-U01-L02', unitNo: 1, lessonNo: 2, steps: ['learn', 'dialogue'], started: true });
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

describe('focusStep (레슨 화면에서 강조할 다음 단계)', () => {
  it('하던 단계가 아직 안 끝났으면 그 단계', () => {
    expect(focusStep('drill', ['learn', 'dialogue'])).toBe('drill');
  });

  it('하던 단계가 이미 끝났으면 안 끝낸 첫 단계', () => {
    expect(focusStep('learn', ['learn'])).toBe('dialogue');
    expect(focusStep('done', ['learn', 'dialogue', 'drill'])).toBe('roleplay');
  });

  it('처음 보는 레슨은 설명, 다 끝낸 레슨은 없음', () => {
    expect(focusStep(undefined, undefined)).toBe('learn');
    expect(focusStep('done', ['learn', 'dialogue', 'drill', 'roleplay'])).toBeNull();
  });
});
