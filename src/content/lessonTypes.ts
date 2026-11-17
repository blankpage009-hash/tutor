// 새 커리큘럼(Phase 5.5)의 콘텐츠 모양. 원고 규칙은 new curriculum/CLAUDE.md,
// 앱이 읽는 것은 make_lesson_audio.py가 만든 content/curriculum.json·content/lessons/ 복사본이다.
// audio 값은 모두 content/ 기준 경로(예: audio/lessons/INT1-U03-L03/key-xxxx.m4a)다.

export type AudioPair = { normal: string; slow: string };

export type KeySentence = { en: string; ko: string; stress: string; audio: AudioPair };

export type DialogueLine = { no: number; speaker: 'partner' | 'me'; en: string; ko: string; audio: string };

export type DrillCue = { lang: 'en' | 'ko'; text: string; audio?: string };

export type Drill = { id: number; en: string; ko: string; point: string; cue: DrillCue; audio: AudioPair };

export type DrillStage = {
  reps: number[];
  mode: 'repeat' | 'read' | 'recall' | 'respond';
  show: 'en+ko' | 'en' | 'ko' | 'cue';
  playAudio: boolean;
  passScore: number;
};

// 롤플레이: 상대 줄은 대본·음성이 있고, 내 줄은 예시 답과 꼭 들어갈 키워드만 있다
export type RolePlayLine =
  | { no: number; speaker: 'partner'; en: string; ko: string; audio: string }
  | {
    no: number;
    speaker: 'me';
    freeResponse: true;
    exampleEn: string;
    exampleKo: string;
    requiredKeywords: string[];
  };

export type NewLesson = {
  schemaVersion: string;
  lessonId: string;
  level: string;
  levelCode: string;
  unit: number;
  unitTitle: string;
  lessonNo: number;
  lessonTitle: string;
  estimatedMinutes: number;
  keySentence: KeySentence;
  explanation: { ko: string[]; en: string; enKo: string };
  pronunciation: { focus: string; tip: string }[];
  commonMistakes: { wrong: string; right: string; note: string }[];
  dialogue: {
    situation: string;
    partnerRole: string;
    lines: DialogueLine[];
    expressionNotes: { en: string; ko: string }[];
  };
  drills: Drill[];
  drillStages: DrillStage[];
  retryRule: { maxRetriesPerRep: number; afterFailPlay: 'slow' | 'normal' };
  rolePlay: { situation: string; partnerRole: string; lines: RolePlayLine[]; passRule: string };
};

// 목차(content/curriculum.json): 과정 → 레벨 → 유닛 → 레슨
export type CurriculumLesson = {
  no: number;
  title: string;
  id: string | null; // 레벨 코드가 아직 없으면 null
  ready: boolean;
  file?: string; // ready일 때만 (content/ 기준 경로)
};

export type CurriculumUnit = { no: number; title: string; lessons: CurriculumLesson[] };

export type CurriculumLevel = {
  key: string; // 주소에 쓰는 이름. 코드가 있으면 코드(INT1), 없으면 임시 이름(level-07)
  code: string | null;
  name: string;
  units: CurriculumUnit[];
};

export type CurriculumCourse = { name: string; levels: CurriculumLevel[] };

export type Curriculum = { schemaVersion: number; courses: CurriculumCourse[] };
