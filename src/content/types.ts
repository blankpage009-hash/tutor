// content/schema.md(schemaVersion 1)의 모양을 그대로 옮긴 것. 칸 설명은 schema.md 참조.

export type CourseEntry = {
  id: string;
  file: string;
  order: number;
  title: string;
  titleKo: string;
  level: number;
};

export type Manifest = { schemaVersion: number; courses: CourseEntry[] };

export type VocabItem = { word: string; lemma?: string; ko: string; pos: string; audio?: string };

export type Variation = {
  id: string;
  type: 'situation' | 'subject' | 'tense';
  en: string;
  ko: string;
  audio?: string;
};

export type Sentence = {
  id: string;
  en: string;
  ko: string;
  note: string;
  hintWords: string[];
  vocab: VocabItem[];
  variations: Variation[];
  audio?: string;
};

export type RoleplayTurn =
  | { id: string; speaker: 'tutor'; en: string; ko: string; audio?: string }
  | { speaker: 'me'; sentenceId: string };

export type Roleplay = {
  id: string;
  situation: string;
  tutorRole: string;
  myRole: string;
  turns: RoleplayTurn[];
};

export type Lesson = {
  id: string;
  title: string;
  titleKo: string;
  intro: string;
  sentences: Sentence[];
  roleplay: Roleplay;
};

export type Course = {
  schemaVersion: number;
  id: string;
  idPrefix: string;
  title: string;
  titleKo: string;
  level: number;
  register: 'casual' | 'formal';
  description: string;
  lessons: Lesson[];
};
