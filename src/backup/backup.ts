// 백업 파일(JSON)을 만들고 읽어 검사하는 순수 모듈. 파일은 사용자가 직접 다루는 바깥 입력이라
// 모양이 틀렸거나 일부가 깨졌을 수 있다고 보고, 기기 데이터를 지우기 전에 여기서 먼저 걸러 낸다.
// Gemini 키는 설정 표의 다른 줄에 있어 백업 대상이 아니다 (BackupData에 넣을 자리가 없다)
import { dayKey } from '../activity';
import type { Activity, AppSettings, LessonProgress, SavedSentence, SrsState, VocabWord } from '../db/types';
import { normalizeSettings } from '../settings/settings';
import type { ThemeSetting } from '../theme/theme';

export const BACKUP_APP = 'english-tutor-backup';
export const BACKUP_VERSION = 1;

export type BackupData = {
  theme: ThemeSetting;
  settings: AppSettings;
  savedSentences: SavedSentence[];
  vocab: VocabWord[];
  progress: LessonProgress[];
  srsState: SrsState[];
  activity: Activity[];
};

export type BackupSummary = { savedSentences: number; vocab: number; progress: number; srsState: number; activity: number };

export type ParseResult =
  | { ok: true; data: BackupData; dropped: number; exportedAt: string }
  | { ok: false; error: string };

const STAGES = ['intro', 'shadowing', 'variation', 'review', 'learn', 'dialogue', 'drill', 'roleplay', 'done'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => typeof v === 'string';
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const optStr = (v: unknown) => v === undefined || str(v);
const optCount = (v: unknown) => v === undefined || (num(v) && (v as number) >= 0);

// 표마다 "이 행이 앱이 읽을 수 있는 모양인가"만 본다. 모양이 맞지 않는 행은 버리고 개수를 센다
const ROW_CHECKS = {
  savedSentences: (r: Record<string, unknown>) =>
    str(r.id) && str(r.courseId) && str(r.lessonId) && num(r.savedAt) && optStr(r.note) && optStr(r.en) && optStr(r.ko) && optStr(r.audio),
  vocab: (r: Record<string, unknown>) =>
    str(r.word) && str(r.meaning) && str(r.pos) && num(r.savedAt) && (r.id === undefined || num(r.id)) &&
    optStr(r.sourceSentenceId) && optStr(r.sourceEn) && optStr(r.sourceKo),
  progress: (r: Record<string, unknown>) =>
    str(r.lessonId) && str(r.courseId) && STAGES.includes(r.stage as string) && num(r.updatedAt),
  srsState: (r: Record<string, unknown>) =>
    str(r.id) && (r.kind === 'sentence' || r.kind === 'word') && str(r.itemId) &&
    num(r.dueAt) && num(r.intervalDays) && num(r.ease) && num(r.reps) && num(r.lapses),
  activity: (r: Record<string, unknown>) =>
    str(r.date) && /^\d{4}-\d{2}-\d{2}$/.test(r.date as string) && num(r.practice) && num(r.review) &&
    (r.practice as number) >= 0 && (r.review as number) >= 0 && optCount(r.spoken) && optCount(r.seconds)
};

type TableKey = keyof typeof ROW_CHECKS;
const TABLES = Object.keys(ROW_CHECKS) as TableKey[];

export function buildBackup(data: BackupData, now = Date.now()): string {
  const { theme, settings, ...tables } = data;
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date(now).toISOString(), theme, settings, tables }, null, 2);
}

export function backupFileName(now = Date.now()): string {
  return `${BACKUP_APP}-${dayKey(now)}.json`;
}

function readTable(raw: unknown, key: TableKey): { rows: unknown[]; dropped: number } | null {
  if (raw === undefined) return { rows: [], dropped: 0 }; // 옛 파일에 없는 표는 빈 표로
  if (!Array.isArray(raw)) return null;
  const rows = raw.filter((r) => isObj(r) && ROW_CHECKS[key](r));
  return { rows, dropped: raw.length - rows.length };
}

// 읽기 실패는 이유를 한국어 문장으로 돌려준다 (그대로 화면에 보여 준다)
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: '백업 파일이 아니에요. 파일 내용을 읽을 수 없어요.' };
  }
  if (!isObj(json) || json.app !== BACKUP_APP) return { ok: false, error: '이 앱의 백업 파일이 아니에요.' };
  if (typeof json.version !== 'number' || json.version < 1) return { ok: false, error: '백업 파일의 버전을 알 수 없어요.' };
  if (json.version > BACKUP_VERSION) return { ok: false, error: '더 새 버전의 앱에서 만든 백업이에요. 앱을 최신으로 열고 다시 시도해 주세요.' };
  const tables = json.tables;
  if (!isObj(tables)) return { ok: false, error: '백업 파일에 기록 목록이 없어요.' };

  let dropped = 0;
  const out: Record<string, unknown[]> = {};
  for (const key of TABLES) {
    const t = readTable(tables[key], key);
    if (!t) return { ok: false, error: `백업 파일의 "${key}" 항목이 깨져 있어요.` };
    out[key] = t.rows;
    dropped += t.dropped;
  }
  const theme: ThemeSetting = json.theme === 'light' || json.theme === 'dark' ? json.theme : 'system';
  const data = { theme, settings: normalizeSettings(json.settings), ...out } as BackupData;
  return { ok: true, data, dropped, exportedAt: typeof json.exportedAt === 'string' ? json.exportedAt : '' };
}

export function summarizeBackup(d: BackupData): BackupSummary {
  return {
    savedSentences: d.savedSentences.length, vocab: d.vocab.length, progress: d.progress.length,
    srsState: d.srsState.length, activity: d.activity.length
  };
}
