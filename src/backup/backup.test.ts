import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../db/types';
import { backupFileName, buildBackup, parseBackup, summarizeBackup, type BackupData } from './backup';

const sample: BackupData = {
  theme: 'dark',
  settings: { ...DEFAULT_SETTINGS, tutorName: 'Anna', passThreshold: 0.9, dailyGoal: 20, startLevel: 'INT1' },
  savedSentences: [{ id: 's1', courseId: 'c', lessonId: 'l', savedAt: 1, en: 'Hi', ko: '안녕', audio: 'a.m4a' }],
  vocab: [{ id: 3, word: 'ok', meaning: '좋아', pos: 'adj', savedAt: 2, sourceEn: 'It is ok.' }],
  progress: [{ lessonId: 'l', courseId: 'c', stage: 'done', updatedAt: 5, completedAt: 5, steps: ['learn', 'dialogue'] }],
  srsState: [{ id: 'sentence:s1', kind: 'sentence', itemId: 's1', dueAt: 9, intervalDays: 1, ease: 2.5, reps: 1, lapses: 0 }],
  activity: [{ date: '2026-11-19', practice: 4, review: 2 }]
};

const wrap = (over: Record<string, unknown>) => JSON.stringify({ app: 'english-tutor-backup', version: 1, tables: {}, ...over });

describe('buildBackup / parseBackup 왕복', () => {
  it('만든 파일을 그대로 읽어 같은 데이터가 나온다', () => {
    const r = parseBackup(buildBackup(sample, Date.UTC(2026, 10, 19)));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toEqual(sample);
    expect(r.dropped).toBe(0);
    expect(r.exportedAt).toBe('2026-11-19T00:00:00.000Z');
  });

  it('Gemini 키 같은 설정 표의 다른 줄은 파일에 없다', () => {
    const text = buildBackup(sample);
    expect(text).not.toContain('geminiApiKey');
    expect(text).not.toContain('AIza');
  });

  it('요약 개수', () => {
    expect(summarizeBackup(sample)).toEqual({ savedSentences: 1, vocab: 1, progress: 1, srsState: 1, activity: 1 });
  });
});

describe('parseBackup 거절', () => {
  it('JSON이 깨졌으면', () => {
    expect(parseBackup('{not json')).toMatchObject({ ok: false });
  });

  it('다른 앱의 파일이면', () => {
    expect(parseBackup(JSON.stringify({ app: 'other', version: 1, tables: {} }))).toMatchObject({ ok: false });
    expect(parseBackup('[]')).toMatchObject({ ok: false });
  });

  it('더 새 버전이면 안내 문구와 함께', () => {
    const r = parseBackup(wrap({ version: 2 }));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toContain('새 버전');
  });

  it('버전이 없거나 숫자가 아니면', () => {
    expect(parseBackup(wrap({ version: '1' }))).toMatchObject({ ok: false });
    expect(parseBackup(wrap({ version: 0 }))).toMatchObject({ ok: false });
  });

  it('기록 목록(tables)이 없거나 표가 배열이 아니면', () => {
    expect(parseBackup(JSON.stringify({ app: 'english-tutor-backup', version: 1 }))).toMatchObject({ ok: false });
    expect(parseBackup(wrap({ tables: { vocab: 'x' } }))).toMatchObject({ ok: false });
  });
});

describe('parseBackup 일부 깨진 행', () => {
  it('활동 줄의 말한 문장·공부 시간 칸: 없어도 되고, 있으면 0 이상 숫자', () => {
    const r = parseBackup(wrap({
      tables: { activity: [
        { date: '2026-11-20', practice: 1, review: 0, spoken: 5, seconds: 90 },
        { date: '2026-11-21', practice: 1, review: 0, spoken: -1 },
        { date: '2026-11-22', practice: 1, review: 0, seconds: 'x' },
        sample.activity[0]
      ] }
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.activity.map((a) => a.date)).toEqual(['2026-11-20', '2026-11-19']);
  });

  it('모양이 틀린 행은 빼고 개수를 알린다', () => {
    const r = parseBackup(wrap({
      tables: {
        savedSentences: [sample.savedSentences[0], { id: 5 }, null, 'x'],
        activity: [{ date: '11/19', practice: 1, review: 1 }, { date: '2026-11-19', practice: -1, review: 0 }, sample.activity[0]],
        progress: [{ ...sample.progress[0], stage: 'weird' }]
      }
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.savedSentences).toHaveLength(1);
    expect(r.data.activity).toHaveLength(1);
    expect(r.data.progress).toHaveLength(0);
    expect(r.dropped).toBe(3 + 2 + 1);
  });

  it('없는 표는 빈 표로, 설정·테마는 기본값으로 안전하게', () => {
    const r = parseBackup(wrap({ settings: { passThreshold: 0.1, tutorName: '' }, theme: 'neon' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.vocab).toEqual([]);
    expect(r.data.theme).toBe('system');
    expect(r.data.settings.passThreshold).toBe(DEFAULT_SETTINGS.passThreshold);
    expect(r.data.settings.tutorName).toBe('David');
  });
});

describe('backupFileName', () => {
  it('날짜가 들어간 JSON 이름', () => {
    expect(backupFileName(new Date(2026, 10, 19, 12).getTime())).toBe('english-tutor-backup-2026-11-19.json');
  });
});
