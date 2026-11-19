import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../db/types';
import { normalizeSettings, normalizeTutorName } from './settings';

describe('normalizeSettings', () => {
  it('비어 있거나 이상한 값이면 기본값', () => {
    for (const raw of [undefined, null, 'x', 5, []]) {
      expect(normalizeSettings(raw)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('선택지 안의 값은 그대로 쓴다', () => {
    const s = normalizeSettings({ passThreshold: 0.9, repeatCount: 3, speechRate: 0.8, autoAdvance: true, failFeedback: false, tutorName: 'Anna' });
    expect(s).toMatchObject({ passThreshold: 0.9, repeatCount: 3, speechRate: 0.8, autoAdvance: true, failFeedback: false, tutorName: 'Anna' });
  });

  it('선택지 밖·잘못된 종류의 값은 기본값으로', () => {
    const s = normalizeSettings({ passThreshold: 0.5, repeatCount: '2', speechRate: 3, autoAdvance: 'yes', failFeedback: 1 });
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('테마는 저장된 값을 따르지 않는다 (localStorage가 따로 관리)', () => {
    expect(normalizeSettings({ theme: 'dark' }).theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('일일 목표는 선택지 안의 값만', () => {
    expect(normalizeSettings({ dailyGoal: 20 }).dailyGoal).toBe(20);
    expect(normalizeSettings({ dailyGoal: 99 }).dailyGoal).toBe(DEFAULT_SETTINGS.dailyGoal);
  });

  it('시작 레벨은 글자일 때만, 너무 길면 기본값', () => {
    expect(normalizeSettings({ startLevel: 'INT1' }).startLevel).toBe('INT1');
    expect(normalizeSettings({ startLevel: 5 }).startLevel).toBe('');
    expect(normalizeSettings({ startLevel: 'x'.repeat(41) }).startLevel).toBe('');
  });
});

describe('normalizeTutorName', () => {
  it('앞뒤 공백을 떼고, 비면 David', () => {
    expect(normalizeTutorName('  Anna ')).toBe('Anna');
    expect(normalizeTutorName('   ')).toBe('David');
    expect(normalizeTutorName(undefined)).toBe('David');
  });

  it('20자까지만', () => {
    expect(normalizeTutorName('a'.repeat(30))).toHaveLength(20);
  });
});
