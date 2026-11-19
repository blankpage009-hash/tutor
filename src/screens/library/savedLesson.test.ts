import { describe, expect, it } from 'vitest';
import type { SavedSentence } from '../../db/types';
import { toSavedLesson } from './savedLesson';

const row = (id: string, en?: string): SavedSentence => ({ id, courseId: 'c', lessonId: 'l', savedAt: 0, en, ko: en && '뜻', audio: '' });

describe('보관함 연습 묶음', () => {
  const rows = [row('a', 'A'), row('b', 'B'), row('c', 'C')];

  it('고른 문장부터 시작하고 끝까지 가면 앞쪽으로 돌아온다', () => {
    expect(toSavedLesson(rows, 'b')?.sentences.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('모르는 id이면 처음부터', () => {
    expect(toSavedLesson(rows, 'all')?.sentences.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('글자가 없는 문장은 뺀다', () => {
    expect(toSavedLesson([row('a'), row('b', 'B')], 'all')?.sentences.map((s) => s.id)).toEqual(['b']);
  });

  it('연습할 문장이 없으면 null', () => {
    expect(toSavedLesson([row('a')], 'all')).toBeNull();
  });

  it('음성 경로가 비어 있으면 없는 것으로 둔다', () => {
    expect(toSavedLesson(rows, 'a')?.sentences[0].audio).toBeUndefined();
  });
});
