import { describe, expect, it } from 'vitest';
import type { Curriculum } from './content/lessonTypes';
import type { LessonProgress } from './db/types';
import { currentLevel, locateLevel, percent, summarizeCurriculum, summarizeUnit } from './levelProgress';

const lesson = (id: string | null, ready: boolean) => ({ no: 1, title: id ?? 'x', id, ready, file: ready ? `${id}.json` : undefined });
const curriculum: Curriculum = {
  schemaVersion: 1,
  courses: [
    { name: 'A', levels: [
      { key: 'L1', code: 'L1', name: '레벨1', units: [{ no: 1, title: 'u', lessons: [lesson('L1-1', true), lesson('L1-2', true)] }] },
      { key: 'L2', code: 'L2', name: '레벨2', units: [{ no: 1, title: 'u', lessons: [lesson('L2-1', true), lesson('L2-2', false)] }] }
    ] },
    { name: 'B', levels: [
      { key: 'level-3', code: null, name: '레벨3', units: [{ no: 1, title: 'u', lessons: [lesson(null, false)] }] }
    ] }
  ]
};
const done = (...ids: string[]) => new Map<string, LessonProgress>(ids.map((id) => [id, { lessonId: id, courseId: 'x', stage: 'done', updatedAt: 1 }]));

describe('summarizeCurriculum', () => {
  it('레벨·과정·전체의 완료/준비/전체 수', () => {
    const s = summarizeCurriculum(curriculum, done('L1-1', 'L2-1'));
    expect(s.levels.map((l) => [l.key, l.done, l.ready, l.total])).toEqual([['L1', 1, 2, 2], ['L2', 1, 1, 2], ['level-3', 0, 0, 1]]);
    expect(s.courses.map((c) => [c.name, c.done, c.ready, c.total])).toEqual([['A', 2, 3, 4], ['B', 0, 0, 1]]);
    expect([s.done, s.ready, s.total]).toEqual([2, 3, 5]);
  });

  it('완료가 아닌 단계는 센다 안 함', () => {
    const p = new Map<string, LessonProgress>([['L1-1', { lessonId: 'L1-1', courseId: 'x', stage: 'drill', updatedAt: 1 }]]);
    expect(summarizeCurriculum(curriculum, p).done).toBe(0);
  });
});

describe('currentLevel', () => {
  const stat = (d: string[]) => summarizeCurriculum(curriculum, done(...d)).levels;

  it('시작 레벨이 비었거나 모르는 값이면 첫 레벨', () => {
    expect(currentLevel(stat([]), '')?.key).toBe('L1');
    expect(currentLevel(stat([]), 'nope')?.key).toBe('L1');
  });

  it('레벨의 준비된 레슨을 다 끝내면 다음 레벨로', () => {
    expect(currentLevel(stat(['L1-1']), '')?.key).toBe('L1');
    expect(currentLevel(stat(['L1-1', 'L1-2']), '')?.key).toBe('L2');
  });

  it('시작 레벨을 고르면 거기서 출발', () => {
    expect(currentLevel(stat([]), 'L2')?.key).toBe('L2');
  });

  it('열린 레슨을 전부 끝냈으면 준비된 마지막 레벨에 머문다', () => {
    expect(currentLevel(stat(['L1-1', 'L1-2', 'L2-1']), '')?.key).toBe('L2');
  });

  it('준비된 레슨이 하나도 없는 레벨에서 시작하면 그 레벨 그대로', () => {
    expect(currentLevel(stat([]), 'level-3')?.key).toBe('level-3');
  });

  it('앞쪽 레벨에 원고가 없으면 건너뛰어 레슨이 열린 레벨로', () => {
    const levels = [
      { key: 'A', name: 'A', done: 0, ready: 0, total: 5 },
      { key: 'B', name: 'B', done: 0, ready: 0, total: 5 },
      { key: 'C', name: 'C', done: 1, ready: 6, total: 6 }
    ];
    expect(currentLevel(levels, '')?.key).toBe('C');
  });

  it('레벨이 없으면 null', () => {
    expect(currentLevel([], '')).toBeNull();
  });
});

describe('percent', () => {
  it('준비된 레슨이 없으면 0, 아니면 반올림 %', () => {
    expect(percent(0, 0)).toBe(0);
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
  });
});

describe('유닛 진도 칸', () => {
  const unit = { no: 1, title: 'u', lessons: [lesson('A-1', true), lesson('A-2', true), lesson('A-3', true), lesson(null, false)] };
  const rows = new Map<string, LessonProgress>([
    ['A-1', { lessonId: 'A-1', courseId: 'x', stage: 'done', updatedAt: 1 }],
    ['A-2', { lessonId: 'A-2', courseId: 'x', stage: 'drill', updatedAt: 1 }]
  ]);

  it('끝냄·진행 중·안 함·준비 중을 구분하고 칸 수는 레슨 수와 같다', () => {
    const s = summarizeUnit(unit, rows);
    expect(s.cells).toEqual(['done', 'doing', 'todo', 'soon']);
    expect([s.done, s.ready, s.total]).toEqual([1, 3, 4]);
  });

  it('준비된 레슨이 없는 유닛은 ready가 0', () => {
    expect(summarizeUnit({ no: 2, title: 'u', lessons: [lesson(null, false)] }, new Map()).ready).toBe(0);
  });

  it('옛 단계 이름이 남은 진도는 시작 안 한 것으로 본다', () => {
    const old = new Map<string, LessonProgress>([['A-1', { lessonId: 'A-1', courseId: 'x', stage: 'shadow' as never, updatedAt: 1 }]]);
    expect(summarizeUnit(unit, old).cells[0]).toBe('todo');
  });
});

describe('locateLevel', () => {
  it('과정 번호와 레벨 번호를 찾고, 없는 key는 null', () => {
    expect(locateLevel(curriculum, 'L2')).toEqual({ courseIdx: 0, levelIdx: 1 });
    expect(locateLevel(curriculum, 'level-3')).toEqual({ courseIdx: 1, levelIdx: 0 });
    expect(locateLevel(curriculum, 'nope')).toBeNull();
    expect(locateLevel(curriculum, null)).toBeNull();
  });
});
