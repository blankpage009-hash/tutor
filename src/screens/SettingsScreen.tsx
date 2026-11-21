import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconClose } from '../components/icons/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { SettingsRow } from '../components/SettingsRow';
import { getGeminiKey } from '../db/settings';
import { useTheme } from '../theme/useTheme';
import { DAILY_GOAL_CHOICES, PASS_THRESHOLD_CHOICES, SPEECH_RATE_CHOICES } from '../settings/settings';
import { useSettings } from '../settings/SettingsProvider';
import { BackupSection } from './settings/BackupSection';
import { ChoiceRow } from './settings/ChoiceRow';
import { ProgressSummary } from './settings/ProgressSummary';
import { SwitchRow } from './settings/SwitchRow';
import { useCurriculumProgress } from './progress/useCurriculumProgress';
import styles from './settings/Settings.module.css';
import type { ThemeSetting } from '../theme/theme';

// 배포할 때 이 숫자를 직접 올린다 (사용자 요청 2026-11-21: 현재 1.0.0)
const APP_VERSION = 'Version 1.0.0';

const THEME_CHOICES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

// 키 전체는 화면에 다시 보여 주지 않고 끝 4자리만 알려 준다
function keyValue(key: string | null): string {
  if (key === null) return '';
  return key ? `•••• ${key.slice(-4)}` : 'Not set';
}

function useGeminiKeyValue(): string {
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    getGeminiKey().then(setKey, () => undefined);
  }, []);
  return keyValue(key);
}

function startLevelValue(progress: ReturnType<typeof useCurriculumProgress>, startLevel: string): string {
  if (!startLevel) return 'First';
  if (!progress || progress === 'error') return '';
  return progress.stat.levels.find((l) => l.key === startLevel)?.name ?? '';
}

export function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  const { settings, update, saveError } = useSettings();
  const progress = useCurriculumProgress();
  const geminiKey = useGeminiKeyValue();
  return (
    <>
      {/* 왼쪽 위 뒤로가기 대신 오른쪽 위 X (사용자 요청 2026-11-21). 오늘 화면으로 돌아간다 */}
      <div className={styles.closeRow}>
        <Link to="/" className={styles.closeBtn} aria-label="닫기"><IconClose /></Link>
      </div>
      <ScreenHeader title="Settings" />
      {saveError && <p className={styles.keyError} lang="ko">설정을 저장하지 못했어요. 앱을 닫으면 바뀐 값이 사라질 수 있어요.</p>}
      <ProgressSummary progress={progress}
        beforeAllLevels={<SettingsRow name="Start Level" to="/settings/start-level" value={startLevelValue(progress, settings.startLevel)} />}>
        <ChoiceRow name="Daily Goal" choices={DAILY_GOAL_CHOICES.map((v) => ({ value: v, label: String(v) }))}
          value={settings.dailyGoal} onChange={(dailyGoal) => update({ dailyGoal })} />
      </ProgressSummary>

      <h2 className={styles.section}>TUTOR</h2>
      <ChoiceRow name="Speed" choices={SPEECH_RATE_CHOICES.map((v) => ({ value: v, label: v.toFixed(1) }))}
        value={settings.speechRate} onChange={(speechRate) => update({ speechRate })} />

      <h2 className={styles.section}>PRACTICE</h2>
      <ChoiceRow name="Pass Score" choices={PASS_THRESHOLD_CHOICES.map((v) => ({ value: v, label: String(Math.round(v * 100)) }))}
        value={settings.passThreshold} onChange={(passThreshold) => update({ passThreshold })} />
      <SwitchRow name="Fail Feedback" on={settings.failFeedback} onChange={(failFeedback) => update({ failFeedback })} />

      <h2 className={styles.section}>DISPLAY</h2>
      <ChoiceRow name="Theme" choices={THEME_CHOICES} value={theme} onChange={setTheme} />

      <h2 className={styles.section}>DATA</h2>
      <SettingsRow name="Gemini Key" to="/settings/gemini-key" value={geminiKey} />
      <BackupSection />

      <p className={styles.version}>{APP_VERSION}</p>
    </>
  );
}
