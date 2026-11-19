import { useEffect, useState } from 'react';
import { loadCurriculum } from '../../content/curriculumLoader';
import { listProgress } from '../../db/progress';
import { toProgressMap } from '../../lessonFlow';
import { currentLevel, summarizeCurriculum, type CurriculumStat, type LevelStat } from '../../levelProgress';
import { useSettings } from '../../settings/SettingsProvider';

export type CurriculumProgress = { stat: CurriculumStat; level: LevelStat | null };

// 'error'는 목차나 진도를 못 읽었을 때(인터넷 없이 처음 열기 등). null은 읽는 중.
// 진도까지 다 읽은 뒤에 한 번에 계산해서, 진도 없는 값으로 "내 레벨"이 잠깐 잘못 보이지 않게 한다
export function useCurriculumProgress(): CurriculumProgress | 'error' | null {
  const { startLevel } = useSettings().settings;
  const [state, setState] = useState<CurriculumProgress | 'error' | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([loadCurriculum(), listProgress()]).then(([c, rows]) => {
      if (!alive) return;
      const stat = summarizeCurriculum(c, toProgressMap(rows));
      setState({ stat, level: currentLevel(stat.levels, startLevel) });
    }, () => alive && setState('error'));
    return () => { alive = false; };
  }, [startLevel]);
  return state;
}
