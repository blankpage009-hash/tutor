import { describe, expect, it } from 'vitest';
import { toAnkiTsv, toCsv, toJson } from './exportSaved';

const item = { id: 'INT1-U01-L01-d1', lessonId: 'INT1-U01-L01', courseId: 'INT1', savedAt: 0, en: 'Nice to meet you, too.', ko: '저도 만나서 반가워요.' };

describe('CSV', () => {
  it('머리줄과 한 줄씩, 한글이 깨지지 않게 BOM으로 시작한다', () => {
    const csv = toCsv([item]);
    expect(csv.startsWith('﻿id,english,korean,lesson,saved_at')).toBe(true);
    expect(csv).toContain('INT1-U01-L01-d1,"Nice to meet you, too.",저도 만나서 반가워요.,INT1-U01-L01,');
  });

  it('쉼표·따옴표가 든 칸은 따옴표로 감싼다', () => {
    const csv = toCsv([{ ...item, en: 'Well, "hello"' }]);
    expect(csv).toContain('"Well, ""hello"""');
  });
});

describe('Anki TSV', () => {
  it('앞면 한국어, 뒷면 영어를 탭으로 나눈다', () => {
    expect(toAnkiTsv([item])).toBe('저도 만나서 반가워요.\tNice to meet you, too.\tINT1-U01-L01-d1\n');
  });

  it('칸 안의 탭·줄바꿈은 공백으로 바꾼다', () => {
    const tsv = toAnkiTsv([{ ...item, en: 'a\tb\nc' }]);
    expect(tsv.split('\n')[0].split('\t')).toHaveLength(3);
    expect(tsv).toContain('a b c');
  });
});

describe('JSON', () => {
  it('다시 읽을 수 있는 백업이다', () => {
    const parsed = JSON.parse(toJson([item], 123));
    expect(parsed.items[0].id).toBe('INT1-U01-L01-d1');
    expect(parsed.exportedAt).toBe(123);
  });
});
