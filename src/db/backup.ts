import type { BackupData } from '../backup/backup';
import { normalizeSettings } from '../settings/settings';
import { applyTheme, loadTheme, saveTheme } from '../theme/theme';
import { db } from './db';
import { APP_SETTINGS_KEY, getAppSettingsRaw } from './settings';

// 백업 대상 표만 읽는다. settings 표 전체가 아니라 앱 설정 한 줄만 꺼내므로 Gemini 키가 섞일 수 없다
export async function collectBackupData(): Promise<BackupData> {
  const [savedSentences, vocab, progress, srsState, activity, rawSettings] = await Promise.all([
    db.savedSentences.toArray(), db.vocab.toArray(), db.progress.toArray(), db.srsState.toArray(),
    db.activity.toArray(), getAppSettingsRaw()
  ]);
  return { theme: loadTheme(), settings: normalizeSettings(rawSettings), savedSentences, vocab, progress, srsState, activity };
}

// 한 트랜잭션: 중간에 실패하면 전부 원래대로 돌아가 "반쪽만 복원된" 상태가 생기지 않는다.
// 이 기기의 Gemini 키(settings 표의 다른 줄)와 녹음 표는 건드리지 않는다
export async function restoreBackup(data: BackupData): Promise<void> {
  await db.transaction('rw', [db.savedSentences, db.vocab, db.progress, db.srsState, db.activity, db.settings], async () => {
    await Promise.all([db.savedSentences.clear(), db.vocab.clear(), db.progress.clear(), db.srsState.clear(), db.activity.clear()]);
    await db.savedSentences.bulkPut(data.savedSentences);
    await db.vocab.bulkPut(data.vocab);
    await db.progress.bulkPut(data.progress);
    await db.srsState.bulkPut(data.srsState);
    await db.activity.bulkPut(data.activity);
    await db.settings.put({ key: APP_SETTINGS_KEY, value: data.settings });
  });
  // 테마는 깜빡임 방지로 localStorage에 따로 있어서 트랜잭션 밖에서 맞춘다
  saveTheme(data.theme);
  applyTheme(data.theme);
}

// 모든 표(녹음·Gemini 키 포함)와 테마까지 지운다
export async function resetAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  saveTheme('system');
  applyTheme('system');
}
