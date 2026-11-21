// 앱이 기기(IndexedDB)에 저장하는 데이터의 모양. 콘텐츠 원본(content/*.json)은 여기에 복사하지 않고
// id로만 가리킨다 — 콘텐츠를 고쳐도 사용자의 저장 기록이 깨지지 않게 하기 위해서.

export type SavedSentence = {
  id: string; // 콘텐츠의 문장 id (예: beg-12-s1)
  courseId: string;
  lessonId: string;
  savedAt: number; // ms
  note?: string;
  // 보관함이 레슨 파일을 다시 찾지 않고 바로 보여 주고 연습하려고 저장할 때 함께 적어 둔다.
  // 예전에 저장한 문장에는 없어서 선택 칸이다 (칸만 늘렸고 색인은 그대로라 DB 버전은 그대로)
  en?: string;
  ko?: string;
  audio?: string; // content/ 기준 경로
};

export type VocabWord = {
  id?: number; // 자동 번호
  word: string;
  meaning: string; // 사용자가 고칠 수 있음
  pos: string;
  sourceSentenceId?: string;
  // 출처 문장의 글자도 함께 적어 둔다: 문장 빈칸 퀴즈·단어 목록이 콘텐츠 파일을 다시 찾지 않게.
  // 예전 모양에는 없어서 선택 칸이다 (색인은 그대로라 DB 버전은 그대로)
  sourceEn?: string;
  sourceKo?: string;
  // 퀴즈에서 맞혔으면 true. 없거나 false면 Unknown (새로 저장한 단어도 Unknown으로 시작).
  // 칸만 늘렸고 색인은 그대로라 DB 버전은 그대로
  known?: boolean;
  savedAt: number;
};

// 새 커리큘럼(Phase 5.5) 레슨의 단계. 'done'은 기존 수업과 같이 쓴다.
// 칸 모양만 넓혔고 색인은 그대로라 DB 버전을 올리지 않아도 된다
export type NewLessonStage = 'learn' | 'dialogue' | 'drill' | 'roleplay' | 'done';
export type NewLessonStep = Exclude<NewLessonStage, 'done'>;

// 드릴을 중간에 나갔다 와도 이어서 하도록 남기는 위치 (사용자 요청 2026-11-18)
export type DrillPosition = { index: number; cleared: string[] };

export type LessonProgress = {
  lessonId: string;
  courseId: string; // 새 레슨은 레벨 key(예: INT1)
  // 기존 수업: 가장 멀리 간 단계. 새 레슨: 마지막으로 들어간 단계, 네 단계를 다 끝내면 'done'
  stage: 'intro' | 'shadowing' | 'variation' | 'review' | NewLessonStage;
  updatedAt: number;
  completedAt?: number;
  steps?: NewLessonStep[]; // 새 레슨에서 끝까지 간 단계들
  drill?: DrillPosition; // 새 레슨 드릴을 하다 만 위치 (다 끝내면 지운다)
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

// 하루치 활동 횟수. date는 기기 현지 날짜('YYYY-MM-DD'). 스트릭·일일 목표 계산용 (Phase 7-B)
// practice: 쉐도잉·대화문·드릴 통과 + 끝낸 레슨 단계, review: 복습 기록(문장·단어). 둘은 겹쳐 세지 않는다
export type Activity = { date: string; practice: number; review: number };

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
  dailyGoal: number; // 하루에 채울 연습 횟수
  startLevel: string; // 내 레벨의 출발점(커리큘럼 레벨 key). ''이면 첫 레벨
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
  startLevel: '',
  theme: 'system'
};
