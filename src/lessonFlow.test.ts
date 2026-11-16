import { describe, expect, it } from 'vitest';
import type { Lesson } from './content/types';
import type { LessonProgress } from './db/types';
import {
  countDone, findResume, laterStage, stageAfter, stagePath, toProgressMap, toVariationLesson
} from './lessonFlow';

const row = (lessonId: string, stage: LessonProgress['stage'], updatedAt = 1): LessonProgress =>
  ({ lessonId, courseId: 'c', stage, updatedAt });

describe('수업 흐름', () => {
  it('진도는 뒤로 가지 않는다', () => {
    expect(laterStage(undefined, 'intro')).toBe('intro');
    expect(laterStage('variation', 'shadowing')).toBe('variation');
    expect(laterStage('done', 'intro')).toBe('done');
    expect(laterStage('intro', 'review')).toBe('review');
  });

  it('쉐도잉 → 변형 → 복습 → 완료 순서', () => {
    expect(stageAfter('shadowing')).toBe('variation');
    expect(stageAfter('variation')).toBe('review');
    expect(stageAfter('review')).toBe('done');
    expect(stagePath('beg-01', 'review')).toBe('/lesson-review/beg-01');
    expect(stagePath('beg-01', 'done')).toBe('/lesson/beg-01');
  });

  it('변형 문장을 쉐도잉용 문장으로 바꾼다', () => {
    const lesson = {
      id: 'beg-01',
      sentences: [{
        id: 'beg-01-s1', variations: [
          { id: 'beg-01-s1-v1', type: 'situation', en: 'A', ko: '가', audio: 'a.m4a' },
          { id: 'beg-01-s1-v2', type: 'subject', en: 'B', ko: '나' }
        ]
      }]
    } as unknown as Lesson;
    const v = toVariationLesson(lesson);
    expect(v.sentences.map((s) => s.id)).toEqual(['beg-01-s1-v1', 'beg-01-s1-v2']);
    expect(v.sentences[0].audio).toBe('a.m4a');
  });

  it('이어서 할 수업을 고른다', () => {
    const lessons = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(findResume(lessons, toProgressMap([]))).toEqual({ id: 'a', stage: 'intro' });
    const p = toProgressMap([row('a', 'done'), row('b', 'variation', 5)]);
    expect(findResume(lessons, p)).toEqual({ id: 'b', stage: 'variation' });
    const p2 = toProgressMap([row('a', 'done'), row('b', 'done')]);
    expect(findResume(lessons, p2)).toEqual({ id: 'c', stage: 'intro' });
    const all = toProgressMap(lessons.map((l) => row(l.id, 'done')));
    expect(findResume(lessons, all)).toBeNull();
    expect(countDone(lessons, p2)).toBe(2);
  });
});
