import Dexie, { type EntityTable } from 'dexie';
import type {
  Activity,
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
  activity!: EntityTable<Activity, 'date'>;

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
    // 7-B: 날짜별 활동 표만 더한다. Dexie는 새 표만 만들고 기존 표의 데이터는 그대로 둔다
    this.version(2).stores({ activity: 'date' });
    // 말한 문장 수는 "학습 시작부터"라서 지난 통과 기록(practice)으로 시작한다. 공부 시간은 지난 기록이 없어 0
    this.version(3).stores({}).upgrade((tx) => tx.table('activity').toCollection().modify((r: Activity) => {
      r.spoken ??= r.practice;
      r.seconds ??= 0;
    }));
  }
}

export const db = new TutorDb();
