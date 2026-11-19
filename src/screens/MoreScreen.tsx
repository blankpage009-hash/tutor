import { ScreenHeader } from '../components/ScreenHeader';
import { SettingsRow } from '../components/SettingsRow';

// handoff.md 4.1: 더보기는 화살표 줄 4개짜리 단순 목록
export function MoreScreen() {
  return (
    <>
      <ScreenHeader eyebrow="더보기" title="더보기" />
      <SettingsRow name="프롬프트 만들기" hint="외부 음성모드용 프롬프트" to="/more/prompt" />
      <SettingsRow name="진도 · 레벨" to="/more/progress" />
      <SettingsRow name="설정" to="/more/settings" />
    </>
  );
}
