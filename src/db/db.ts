import Dexie, { type EntityTable } from 'dexie';
import type {
  LessonProgress,
  Recording,
  SavedSentence,
  SettingRow,
  SrsState,
  VocabWord
} from './types';

export class TutorDb extends Dexie {
  savedSentences!: EntityTable<SavedSentence, 'id'>;
  vocab!: EntityTable<VocabWord, 'id'>;
  progress!: EntityTable<LessonProgress, 'lessonId'>;
  settings!: EntityTable<SettingRow, 'key'>;
  srsState!: EntityTable<SrsState, 'id'>;
  recordings!: EntityTable<Recording, 'id'>;

  constructor(name = 'tutor') {
    super(name);
    // 인덱스는 "찾을 때 쓰는 칸"만 적는다. 표 구조를 바꾸면 version을 올리고 upgrade를 쓴다.
    this.version(1).stores({
      savedSentences: 'id, courseId, lessonId, savedAt',
      vocab: '++id, word, sourceSentenceId, savedAt',
      progress: 'lessonId, courseId, updatedAt',
      settings: 'key',
      srsState: 'id, kind, dueAt',
      recordings: '++id, sentenceId, createdAt'
    });
  }
}

export const db = new TutorDb();
