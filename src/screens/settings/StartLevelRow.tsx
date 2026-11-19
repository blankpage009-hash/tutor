import { useEffect, useState } from 'react';
import { SettingsRow } from '../../components/SettingsRow';
import { allLevels, loadCurriculum } from '../../content/curriculumLoader';
import { useSettings } from '../../settings/SettingsProvider';
import styles from './Settings.module.css';

// 레벨이 20개라 버튼 줄 대신 드롭다운. 커리큘럼을 못 읽으면(인터넷 없음) 행 자체를 숨긴다
export function StartLevelRow() {
  const { settings, update } = useSettings();
  const [levels, setLevels] = useState<{ key: string; name: string }[] | null>(null);
  useEffect(() => {
    loadCurriculum().then((c) => setLevels(allLevels(c).map((l) => ({ key: l.key, name: l.name }))), () => setLevels(null));
  }, []);
  if (!levels) return null;
  return (
    <>
      <SettingsRow name="시작 레벨" hint="내 레벨의 출발점이에요. 그 레벨의 레슨을 다 끝내면 다음 레벨로 올라가요" />
      <div style={{ padding: 'var(--space-3) 0' }}>
        <select className={styles.input} aria-label="시작 레벨" value={settings.startLevel}
          onChange={(e) => update({ startLevel: e.target.value })}>
          <option value="">처음부터 (첫 레벨)</option>
          {levels.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
        </select>
      </div>
    </>
  );
}
