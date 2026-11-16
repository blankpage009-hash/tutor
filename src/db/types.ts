// 앱이 기기(IndexedDB)에 저장하는 데이터의 모양. 콘텐츠 원본(content/*.json)은 여기에 복사하지 않고
// id로만 가리킨다 — 콘텐츠를 고쳐도 사용자의 저장 기록이 깨지지 않게 하기 위해서.

export type SavedSentence = {
  id: string; // 콘텐츠의 문장 id (예: beg-12-s1)
  courseId: string;
  lessonId: string;
  savedAt: number; // ms
  note?: string;
};

export type VocabWord = {
  id?: number; // 자동 번호
  word: string;
  meaning: string; // 사용자가 고칠 수 있음
  pos: string;
  sourceSentenceId?: string;
  savedAt: number;
};

export type LessonProgress = {
  lessonId: string;
  courseId: string;
  stage: 'intro' | 'shadowing' | 'variation' | 'review' | 'done';
  updatedAt: number;
  completedAt?: number;
};

export type SettingRow = { key: string; value: unknown };

// 문장과 단어가 같은 SRS 계산 모듈을 쓰므로 한 표에 kind로 구분해 둔다
export type SrsState = {
  id: string; // `${kind}:${itemId}`
  kind: 'sentence' | 'word';
  itemId: string;
  dueAt: number; // 다음 복습 시각(ms)
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
};

export type Recording = {
  id?: number;
  sentenceId: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
};

export type AppSettings = {
  tutorName: string;
  speechRate: number;
  passThreshold: number; // 0~1
  repeatCount: number;
  autoAdvance: boolean;
  failFeedback: boolean;
  dailyGoal: number;
  theme: 'system' | 'light' | 'dark';
};

// PLAN.md 5.11 기준 기본값. 구체 숫자(통과 기준 등)는 Phase 4에서 실제로 써 보고 조정한다.
export const DEFAULT_SETTINGS: AppSettings = {
  tutorName: 'David',
  speechRate: 1,
  passThreshold: 0.8,
  repeatCount: 1,
  autoAdvance: false, // PLAN 5.3: 기본 꺼짐 (Phase 4에서 바로잡음)
  failFeedback: true,
  dailyGoal: 10,
  theme: 'system'
};
