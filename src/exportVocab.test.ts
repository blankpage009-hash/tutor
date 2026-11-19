import { describe, expect, it } from 'vitest';
import { toAnkiTsv, toCsv, toJson } from './exportVocab';

const items = [
  { word: 'laptop', meaning: '노트북, "휴대용" 컴퓨터', pos: 'noun', sourceEn: 'I need a new laptop.', sourceKo: '새 노트북이 필요해요.', savedAt: Date.UTC(2026, 10, 19) },
  { word: 'torn', meaning: '마음이 갈리는', pos: 'adjective', savedAt: Date.UTC(2026, 10, 20) }
];

describe('exportVocab', () => {
  it('CSV: BOM + 제목 줄, 쉼표·따옴표 칸은 따옴표로 감싼다', () => {
    const csv = toCsv(items);
    expect(csv.startsWith('﻿word,meaning,part_of_speech,')).toBe(true);
    expect(csv).toContain('laptop,"노트북, ""휴대용"" 컴퓨터",명사,I need a new laptop.,');
    expect(csv).toContain('torn,마음이 갈리는,형용사,,,');
  });

  it('Anki: 앞면 단어, 뒷면 뜻(품사), 세 번째 칸 문장', () => {
    expect(toAnkiTsv(items)).toBe(
      'laptop\t노트북, "휴대용" 컴퓨터 (명사)\tI need a new laptop.\ntorn\t마음이 갈리는 (형용사)\t\n'
    );
  });

  it('Anki: 칸 안의 탭·줄바꿈은 공백으로', () => {
    expect(toAnkiTsv([{ ...items[1], meaning: '가\t나\n다' }])).toContain('가 나 다 (형용사)');
  });

  it('JSON: 종류 표시와 항목', () => {
    const j = JSON.parse(toJson(items, 5));
    expect(j).toMatchObject({ app: 'english-tutor', kind: 'vocab', exportedAt: 5 });
    expect(j.items).toHaveLength(2);
  });
});
