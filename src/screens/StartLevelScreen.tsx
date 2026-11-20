import { useEffect, useState } from 'react';
import { BackLink } from '../components/BackLink';
import { IconCheck } from '../components/icons/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { allLevels, loadCurriculum } from '../content/curriculumLoader';
import { useSettings } from '../settings/SettingsProvider';
import styles from './settings/Settings.module.css';

type Level = { key: string; name: string };

// 레벨이 20개라 줄 목록으로 고른다. 커리큘럼을 못 읽으면(인터넷 없음) 안내만 보여 준다
export function StartLevelScreen() {
  const { settings, update } = useSettings();
  const [levels, setLevels] = useState<Level[] | 'error' | null>(null);
  useEffect(() => {
    loadCurriculum().then((c) => setLevels(allLevels(c).map((l) => ({ key: l.key, name: l.name }))), () => setLevels('error'));
  }, []);
  const options: Level[] = [{ key: '', name: '처음부터 (첫 레벨)' }, ...(Array.isArray(levels) ? levels : [])];
  return (
    <>
      <BackLink to="/settings" label="Settings" />
      <ScreenHeader eyebrow="PRACTICE" title="Start Level" />
      <p className={styles.note} lang="ko">내 레벨의 출발점이에요. 그 레벨의 레슨을 다 끝내면 다음 레벨로 올라가요.</p>
      {levels === 'error' && <p className={styles.keyError} lang="ko">레벨 목록을 못 읽었어요. 인터넷 연결을 확인하고 다시 열어 주세요.</p>}
      {levels !== null && options.map((o) => (
        <button key={o.key} type="button" aria-pressed={o.key === settings.startLevel}
          className={`${styles.pick} ${o.key === settings.startLevel ? styles.picked : ''}`}
          onClick={() => update({ startLevel: o.key })}>
          <span lang="ko">{o.name}</span>
          {o.key === settings.startLevel && <IconCheck />}
        </button>
      ))}
    </>
  );
}
