import { db } from './db';

// settings 표(key, value)에 한 칸씩 저장한다. 이 표는 백업 내보내기(Phase 7)에 그대로 넣지 말 것:
// Gemini 키가 들어 있어서, 백업 파일에 키가 섞여 나가면 안 된다. 백업에는 APP_KEY 줄만 넣는다.
const GEMINI_KEY = 'geminiApiKey';
// 앱 설정(튜터 이름·통과 기준 등)은 한 줄에 객체로 모아 둔다 — 키와 섞이지 않게
export const APP_SETTINGS_KEY = 'app';

export async function getAppSettingsRaw(): Promise<unknown> {
  return (await db.settings.get(APP_SETTINGS_KEY))?.value;
}

export async function saveAppSettingsRaw(value: unknown): Promise<void> {
  await db.settings.put({ key: APP_SETTINGS_KEY, value });
}

export async function getGeminiKey(): Promise<string> {
  const row = await db.settings.get(GEMINI_KEY);
  return typeof row?.value === 'string' ? row.value : '';
}

export async function setGeminiKey(key: string): Promise<void> {
  const v = key.trim();
  if (v) await db.settings.put({ key: GEMINI_KEY, value: v });
  else await db.settings.delete(GEMINI_KEY);
}
