import type { Course, Lesson, Manifest } from './types';

// 앱 주소가 /tutor/ 아래라서 BASE_URL을 앞에 붙인다 (개발 서버와 배포본 모두 같은 규칙)
export function contentUrl(relPath: string): string {
  return `${import.meta.env.BASE_URL}content/${relPath}`;
}

let manifestPromise: Promise<Manifest> | null = null;
const coursePromises = new Map<string, Promise<Course>>();

async function getJson<T>(relPath: string): Promise<T> {
  const res = await fetch(contentUrl(relPath));
  if (!res.ok) throw new Error(`콘텐츠를 못 읽었어요: ${relPath} (${res.status})`);
  return res.json() as Promise<T>;
}

// 같은 파일을 여러 화면이 동시에 요청해도 한 번만 받도록 약속(Promise)을 저장해 둔다
export function loadManifest(): Promise<Manifest> {
  manifestPromise ??= getJson<Manifest>('manifest.json');
  return manifestPromise;
}

export async function loadCourse(courseId: string): Promise<Course> {
  let p = coursePromises.get(courseId);
  if (!p) {
    p = loadManifest().then((m) => {
      const entry = m.courses.find((c) => c.id === courseId);
      if (!entry) throw new Error(`코스가 없어요: ${courseId}`);
      return getJson<Course>(entry.file);
    });
    coursePromises.set(courseId, p);
  }
  return p;
}

// 수업 id 앞부분(idPrefix, 예: beg-01 → beg)으로 코스를 찾는다
export async function loadLesson(lessonId: string): Promise<{ course: Course; lesson: Lesson }> {
  const prefix = lessonId.split('-')[0];
  const manifest = await loadManifest();
  for (const entry of manifest.courses) {
    const course = await loadCourse(entry.id);
    if (course.idPrefix !== prefix) continue;
    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (lesson) return { course, lesson };
  }
  throw new Error(`수업이 없어요: ${lessonId}`);
}
