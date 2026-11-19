import { useEffect, useState } from 'react';
import { loadCurriculum } from '../../content/curriculumLoader';
import type { ProgressMap } from '../../lessonFlow';
import { findNewResume, type NewResume } from '../../newLessonFlow';

// 새 커리큘럼: 하던 레슨, 없으면 아직 안 끝낸 다음 레슨 (사용자 결정 2026-11-18: 홈 맨 위).
// undefined = 불러오는 중, null = 이어 할 레슨 없음(모두 끝냄 또는 목차를 못 읽음)
export function useNewResume(progress: ProgressMap): NewResume | null | undefined {
  const [resume, setResume] = useState<NewResume | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    loadCurriculum()
      .then((c) => alive && setResume(findNewResume(c, progress)))
      .catch(() => alive && setResume(null));
    return () => { alive = false; };
  }, [progress]);
  return resume;
}
