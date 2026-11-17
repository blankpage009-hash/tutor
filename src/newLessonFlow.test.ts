import { describe, expect, it } from 'vitest';
import { isNewStage, laterNewStage, newStagePath, nextNewStage, NEW_STAGES } from './newLessonFlow';

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
