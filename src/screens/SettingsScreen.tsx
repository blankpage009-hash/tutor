import { BackLink } from '../components/BackLink';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTheme } from '../theme/useTheme';
import { DAILY_GOAL_CHOICES, PASS_THRESHOLD_CHOICES, REPEAT_COUNT_CHOICES, SPEECH_RATE_CHOICES } from '../settings/settings';
import { useSettings } from '../settings/SettingsProvider';
import { ChoiceRow } from './settings/ChoiceRow';
import { BackupSection } from './settings/BackupSection';
import { GeminiKeyRow } from './settings/GeminiKeyRow';
import { StartLevelRow } from './settings/StartLevelRow';
import { TutorNameRow } from './settings/TutorNameRow';
import styles from './settings/Settings.module.css';
import type { ThemeSetting } from '../theme/theme';

const THEME_CHOICES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' }
];
const ON_OFF = [{ value: true, label: '켜기' }, { value: false, label: '끄기' }];

export function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  const { settings, update, saveError } = useSettings();
  return (
    <>
      <BackLink to="/" label="오늘" />
      <ScreenHeader eyebrow="오늘" title="설정" />
      {saveError && <p className={styles.keyError} lang="ko">설정을 저장하지 못했어요. 앱을 닫으면 바뀐 값이 사라질 수 있어요.</p>}
      <TutorNameRow />
      <ChoiceRow name="말하기 속도" hint="튜터 목소리의 보통 속도예요. 실패했을 때 느리게 다시 들려주는 소리는 그대로예요"
        choices={SPEECH_RATE_CHOICES.map((v) => ({ value: v, label: `${v.toFixed(1)}배` }))}
        value={settings.speechRate} onChange={(speechRate) => update({ speechRate })} />
      <ChoiceRow name="통과 기준" hint="내 말이 문장과 얼마나 같아야 통과인지"
        choices={PASS_THRESHOLD_CHOICES.map((v) => ({ value: v, label: `${Math.round(v * 100)}%` }))}
        value={settings.passThreshold} onChange={(passThreshold) => update({ passThreshold })} />
      <ChoiceRow name="반복 횟수" hint="쉐도잉·변형 연습·수업 복습에서 문장마다 통과해야 하는 횟수"
        choices={REPEAT_COUNT_CHOICES.map((v) => ({ value: v, label: `${v}번` }))}
        value={settings.repeatCount} onChange={(repeatCount) => update({ repeatCount })} />
      <ChoiceRow name="자동 넘기기" hint="쉐도잉에서 통과하면 1.5초 뒤 다음 문장으로. 쉐도잉 화면 스위치의 처음 상태예요"
        choices={ON_OFF} value={settings.autoAdvance} onChange={(autoAdvance) => update({ autoAdvance })} />
      <ChoiceRow name="실패 피드백" hint="쉐도잉에서 틀리면 들린 말을 보여 주고 느리게 다시 들려줘요"
        choices={ON_OFF} value={settings.failFeedback} onChange={(failFeedback) => update({ failFeedback })} />
      <ChoiceRow name="일일 목표" hint="하루에 채울 연습 횟수예요. 쉐도잉·대화문·드릴 통과와 복습을 합쳐서 세요"
        choices={DAILY_GOAL_CHOICES.map((v) => ({ value: v, label: `${v}번` }))}
        value={settings.dailyGoal} onChange={(dailyGoal) => update({ dailyGoal })} />
      <StartLevelRow />
      <ChoiceRow name="테마" choices={THEME_CHOICES} value={theme} onChange={setTheme} />
      <GeminiKeyRow />
      <BackupSection />
    </>
  );
}
