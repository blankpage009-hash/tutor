// 레슨 진도를 "레슨 id → 진도 한 줄"로 찾기 쉽게 바꾸는 순수 모듈.
// 옛 10코스의 단계 이동 규칙은 코스 삭제와 함께 지웠다. 새 커리큘럼의 단계 이동은 newLessonFlow.ts에 있다.
import type { LessonProgress } from './db/types';

export type ProgressMap = ReadonlyMap<string, LessonProgress>;

export function toProgressMap(rows: LessonProgress[]): Map<string, LessonProgress> {
  return new Map(rows.map((r) => [r.lessonId, r]));
}
