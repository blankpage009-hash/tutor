import { contentUrl } from './loader';
import type { Curriculum, CurriculumLesson, CurriculumLevel, NewLesson } from './lessonTypes';

let curriculumPromise: Promise<Curriculum> | null = null;
const lessonPromises = new Map<string, Promise<NewLesson>>();

async function getJson<T>(relPath: string): Promise<T> {
  const res = await fetch(contentUrl(relPath));
  if (!res.ok) throw new Error(`콘텐츠를 못 읽었어요: ${relPath} (${res.status})`);
  return res.json() as Promise<T>;
}

// 기존 loader.ts와 같은 방식: 여러 화면이 동시에 불러도 파일은 한 번만 받는다.
// 실패한 약속은 지워서, 인터넷이 돌아온 뒤 다시 들어오면 새로 받게 한다
export function loadCurriculum(): Promise<Curriculum> {
  curriculumPromise ??= getJson<Curriculum>('curriculum.json').catch((e) => {
    curriculumPromise = null;
    throw e;
  });
  return curriculumPromise;
}

export function allLevels(c: Curriculum): CurriculumLevel[] {
  return c.courses.flatMap((course) => course.levels);
}

export function levelLessons(level: CurriculumLevel): CurriculumLesson[] {
  return level.units.flatMap((u) => u.lessons);
}

export async function loadLevel(levelKey: string): Promise<CurriculumLevel> {
  const level = allLevels(await loadCurriculum()).find((l) => l.key === levelKey);
  if (!level) throw new Error(`레벨이 없어요: ${levelKey}`);
  return level;
}

// 레슨 id(INT1-U03-L03)로 목차에서 파일 위치를 찾아 읽는다
export function loadNewLesson(lessonId: string): Promise<NewLesson> {
  let p = lessonPromises.get(lessonId);
  if (!p) {
    p = loadCurriculum().then((c) => {
      const entry = allLevels(c).flatMap(levelLessons).find((l) => l.id === lessonId);
      if (!entry?.file) throw new Error(`레슨이 없어요: ${lessonId}`);
      return getJson<NewLesson>(entry.file);
    });
    p.catch(() => lessonPromises.delete(lessonId));
    lessonPromises.set(lessonId, p);
  }
  return p;
}
