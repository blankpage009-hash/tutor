import { db } from './db';

// settings 표(key, value)에 한 칸씩 저장한다. 이 표는 백업 내보내기(Phase 7)에 그대로 넣지 말 것:
// Gemini 키가 들어 있어서, 백업 파일에 키가 섞여 나가면 안 된다.
const GEMINI_KEY = 'geminiApiKey';

export async function getGeminiKey(): Promise<string> {
  const row = await db.settings.get(GEMINI_KEY);
  return typeof row?.value === 'string' ? row.value : '';
}

export async function setGeminiKey(key: string): Promise<void> {
  const v = key.trim();
  if (v) await db.settings.put({ key: GEMINI_KEY, value: v });
  else await db.settings.delete(GEMINI_KEY);
}
