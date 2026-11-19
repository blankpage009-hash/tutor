import { allLevels } from '../../content/curriculumLoader';
import type { Curriculum } from '../../content/lessonTypes';
import type { ProgressMap } from '../../lessonFlow';

export type DoneLesson = { id: string; title: string; unit: string };
export type DoneGroup = { levelKey: string; levelName: string; lessons: DoneLesson[] };

// 롤플레이는 배운 문장을 쓰는 연습이라, 네 단계를 모두 끝낸('done') 레슨만 골라 레벨별로 묶는다 (목차 순서 유지)
export function doneLessonGroups(c: Curriculum, progress: ProgressMap): DoneGroup[] {
  return allLevels(c).flatMap((level) => {
    const lessons = level.units.flatMap((u) =>
      u.lessons
        .filter((l) => l.ready && l.id && progress.get(l.id)?.stage === 'done')
        .map((l) => ({ id: l.id as string, title: `${l.no}. ${l.title}`, unit: `유닛 ${u.no} · ${u.title}` })));
    return lessons.length ? [{ levelKey: level.key, levelName: level.name, lessons }] : [];
  });
}
