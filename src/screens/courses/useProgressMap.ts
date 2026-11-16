import { useEffect, useState } from 'react';
import { listProgress } from '../../db/progress';
import { toProgressMap, type ProgressMap } from '../../lessonFlow';

// 저장된 진도를 한 번 읽어 온다. 읽기에 실패해도 화면은 "진도 없음"으로 계속 보여 준다
export function useProgressMap(): ProgressMap {
  const [map, setMap] = useState<ProgressMap>(new Map());
  useEffect(() => {
    listProgress().then((rows) => setMap(toProgressMap(rows)), () => undefined);
  }, []);
  return map;
}
