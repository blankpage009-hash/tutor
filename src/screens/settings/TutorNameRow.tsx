import { useState } from 'react';
import { SettingsRow } from '../../components/SettingsRow';
import { normalizeTutorName, TUTOR_NAME_MAX } from '../../settings/settings';
import { useSettings } from '../../settings/SettingsProvider';
import styles from './Settings.module.css';

// 입력하는 동안은 임시 글자(draft)를 쓰고, 칸을 벗어날 때 저장한다 — 글자를 칠 때마다 저장하지 않으려고.
// 비워 두면 기본 이름(David)으로 돌아간다
export function TutorNameRow() {
  const { settings, update } = useSettings();
  const [draft, setDraft] = useState(settings.tutorName);
  const commit = () => {
    const name = normalizeTutorName(draft);
    setDraft(name);
    update({ tutorName: name });
  };
  return (
    <>
      <SettingsRow name="튜터 이름" hint="홈 화면 인사에 써요. 비우면 David" />
      <div style={{ padding: 'var(--space-3) 0' }}>
        <input
          className={styles.input}
          type="text"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={TUTOR_NAME_MAX}
          aria-label="튜터 이름"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
      </div>
    </>
  );
}
