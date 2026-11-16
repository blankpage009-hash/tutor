import { BackLink } from '../components/BackLink';
import { ScreenHeader } from '../components/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { SettingsRow } from '../components/SettingsRow';
import { useTheme } from '../theme/useTheme';
import type { ThemeSetting } from '../theme/theme';

const THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' }
];

// 테마만 동작한다. 나머지 설정 항목은 Phase 7에서 채운다.
export function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <BackLink to="/more" label="더보기" />
      <ScreenHeader eyebrow="더보기" title="설정" />
      <SettingsRow name="테마" hint="나머지 설정은 Phase 7에서 만듭니다" />
      <div style={{ padding: 'var(--space-3) 0' }}>
        <SegmentedControl label="테마" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </div>
    </>
  );
}
