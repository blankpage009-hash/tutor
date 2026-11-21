import { DEFAULT_SETTINGS, type AppSettings } from '../db/types';

// 설정 화면의 선택지. 잘못된 값이 저장돼 있어도 이 목록에 없으면 기본값으로 되돌린다
export const PASS_THRESHOLD_CHOICES = [0.6, 0.7, 0.8, 0.9] as const;
export const REPEAT_COUNT_CHOICES = [1, 2, 3] as const;
// 0.8 아래는 아이폰의 재생 속도 변환이 뭉개져서 하한으로 둔다
export const SPEECH_RATE_CHOICES = [0.8, 0.9, 1, 1.1] as const;

export const DAILY_GOAL_CHOICES = [10, 20, 30, 50, 100] as const;

export const TUTOR_NAME_MAX = 20;
const LEVEL_KEY_MAX = 40;

function pick<T extends number>(v: unknown, choices: readonly T[], fallback: T): T {
  return typeof v === 'number' && (choices as readonly number[]).includes(v) ? (v as T) : fallback;
}

function pickBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export function normalizeTutorName(v: unknown): string {
  const s = typeof v === 'string' ? v.trim().slice(0, TUTOR_NAME_MAX) : '';
  return s || DEFAULT_SETTINGS.tutorName;
}

// 저장소에서 읽은 값(어떤 모양이든)을 안전한 설정으로 바꾼다. 백업 불러오기(7-C)도 같은 함수를 쓴다.
// 시작 레벨이 지금 커리큘럼에 있는지는 여기서 모른다(콘텐츠를 읽어야 해서). 모르는 값은 "내 레벨"을 계산할 때 첫 레벨로 처리된다.
// 테마는 localStorage에 따로 있어서 여기서는 기본값 그대로 둔다
export function normalizeSettings(raw: unknown): AppSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    ...d,
    tutorName: normalizeTutorName(r.tutorName),
    speechRate: pick(r.speechRate, SPEECH_RATE_CHOICES, d.speechRate),
    passThreshold: pick(r.passThreshold, PASS_THRESHOLD_CHOICES, d.passThreshold),
    repeatCount: pick(r.repeatCount, REPEAT_COUNT_CHOICES, d.repeatCount),
    autoAdvance: pickBool(r.autoAdvance, d.autoAdvance),
    failFeedback: pickBool(r.failFeedback, d.failFeedback),
    dailyGoal: pick(r.dailyGoal, DAILY_GOAL_CHOICES, d.dailyGoal),
    startLevel: typeof r.startLevel === 'string' && r.startLevel.length <= LEVEL_KEY_MAX ? r.startLevel : d.startLevel
  };
}
