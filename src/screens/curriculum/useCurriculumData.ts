import { useEffect, useState } from 'react';
import { loadCurriculum } from '../../content/curriculumLoader';
import type { Curriculum } from '../../content/lessonTypes';
import { listProgress } from '../../db/progress';
import { toProgressMap, type ProgressMap } from '../../lessonFlow';

// 목차와 진도를 함께 읽는다. 진도를 다 읽은 뒤에야 화면을 그려서, "내 레벨"로 미리 고른 칸이
// 진도가 늦게 도착하면서 다른 레벨로 튀는 일이 없게 한다. 진도 읽기에 실패하면 "진도 없음"으로 계속 보여 준다
export function useCurriculumData() {
  const [data, setData] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<ProgressMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurriculum().then(setData, (e) => setError(String(e)));
    listProgress().then((rows) => setProgress(toProgressMap(rows)), () => setProgress(new Map()));
  }, []);

  return { data, progress, error };
}
