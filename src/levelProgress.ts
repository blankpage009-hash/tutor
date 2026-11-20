// 새 커리큘럼(과정 → 레벨 → 유닛 → 레슨)의 진도 숫자와 "내 레벨"을 계산하는 순수 모듈
import type { Curriculum, CurriculumLesson, CurriculumUnit } from './content/lessonTypes';
import type { ProgressMap } from './lessonFlow';
import { isNewStage } from './newLessonFlow';

// ready: 지금 앱에서 할 수 있는 레슨 수(원고가 완성된 것), total: 목차 전체 레슨 수
export type LevelStat = { key: string; name: string; done: number; ready: number; total: number };
export type CourseStat = { name: string; levels: LevelStat[]; done: number; ready: number; total: number };
export type CurriculumStat = { courses: CourseStat[]; levels: LevelStat[]; done: number; ready: number; total: number };

const sum = (xs: { done: number; ready: number; total: number }[]) => ({
  done: xs.reduce((a, x) => a + x.done, 0),
  ready: xs.reduce((a, x) => a + x.ready, 0),
  total: xs.reduce((a, x) => a + x.total, 0)
});

export function summarizeCurriculum(c: Curriculum, progress: ProgressMap): CurriculumStat {
  const courses = c.courses.map((course): CourseStat => {
    const levels = course.levels.map((level): LevelStat => {
      const lessons = level.units.flatMap((u) => u.lessons);
      const ready = lessons.filter((l) => l.ready && l.id);
      return {
        key: level.key, name: level.name, total: lessons.length, ready: ready.length,
        done: ready.filter((l) => progress.get(l.id as string)?.stage === 'done').length
      };
    });
    return { name: course.name, levels, ...sum(levels) };
  });
  const levels = courses.flatMap((course) => course.levels);
  return { courses, levels, ...sum(levels) };
}

// 시작 레벨에서 출발해, "준비된 레슨이 남아 있는 첫 레벨"이 내 레벨이다 (다 끝낸 레벨은 올라가고,
// 원고가 아직 없는 레벨은 건너뛴다 — 할 수 있는 레슨이 없는 레벨을 내 레벨로 보여 주면 홈의 "이어서 할 수업"과 어긋난다).
// 열린 레슨을 전부 끝냈으면 준비된 마지막 레벨에 머문다
export function currentLevel(levels: LevelStat[], startKey: string): LevelStat | null {
  if (levels.length === 0) return null;
  const start = Math.max(0, levels.findIndex((l) => l.key === startKey));
  const open = levels.findIndex((l, i) => i >= start && l.ready > 0 && l.done < l.ready);
  if (open >= 0) return levels[open];
  for (let i = levels.length - 1; i >= start; i -= 1) if (levels[i].ready > 0) return levels[i];
  return levels[start];
}

export function percent(done: number, ready: number): number {
  return ready === 0 ? 0 : Math.round((done / ready) * 100);
}

// 코스 탭 유닛 줄의 진도 네모 한 칸의 상태. soon = 아직 안 만든 레슨, doing = 시작했지만 아직 안 끝냄
export type CellState = 'done' | 'doing' | 'todo' | 'soon';

export function lessonCellState(lesson: CurriculumLesson, progress: ProgressMap): CellState {
  if (!lesson.ready || !lesson.id) return 'soon';
  const row = progress.get(lesson.id);
  if (row?.stage === 'done') return 'done';
  return row && isNewStage(row.stage) ? 'doing' : 'todo';
}

// 칸 수는 그 유닛의 레슨 수 그대로다 (유닛마다 3~6개라 시안의 5칸으로 고정하지 않음 — 사용자 결정 2026-11-20)
export type UnitStat = { done: number; ready: number; total: number; cells: CellState[] };

export function summarizeUnit(unit: CurriculumUnit, progress: ProgressMap): UnitStat {
  const cells = unit.lessons.map((l) => lessonCellState(l, progress));
  return {
    done: cells.filter((c) => c === 'done').length,
    ready: cells.filter((c) => c !== 'soon').length,
    total: cells.length,
    cells
  };
}

// 레벨 key로 (몇 번째 과정, 그 안의 몇 번째 레벨)인지 찾는다. 주소의 ?level= 값이 틀려도 화면이 깨지지 않게 null을 돌려준다
export function locateLevel(c: Curriculum, key: string | null): { courseIdx: number; levelIdx: number } | null {
  if (!key) return null;
  for (let courseIdx = 0; courseIdx < c.courses.length; courseIdx += 1) {
    const levelIdx = c.courses[courseIdx].levels.findIndex((l) => l.key === key);
    if (levelIdx >= 0) return { courseIdx, levelIdx };
  }
  return null;
}
