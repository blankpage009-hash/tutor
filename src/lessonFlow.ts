// 수업 한 개의 흐름(짧은 수업 → 쉐도잉 → 변형 연습 → 복습 → 완료)을 계산하는 순수 모듈.
// 화면·저장소와 떼어 두어 테스트로 확인한다.
import type { Lesson } from './content/types';
import type { LessonProgress } from './db/types';

export type Stage = LessonProgress['stage'];
export type PracticeKind = 'shadowing' | 'variation' | 'review';

const ORDER: Stage[] = ['intro', 'shadowing', 'variation', 'review', 'done'];

// 진도는 "가장 멀리 간 단계"만 남긴다. 끝낸 수업을 다시 연습하러 들어와도 '완료'가 되돌아가지 않게
export function laterStage(a: Stage | undefined, b: Stage): Stage {
  if (!a) return b;
  return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b;
}

export function stagePath(lessonId: string, stage: Stage): string {
  switch (stage) {
    case 'shadowing': return `/shadowing/${lessonId}`;
    case 'variation': return `/variation/${lessonId}`;
    case 'review': return `/lesson-review/${lessonId}`;
    default: return `/lesson/${lessonId}`;
  }
}

export const STAGE_OF_KIND: Record<PracticeKind, Stage> = {
  shadowing: 'shadowing',
  variation: 'variation',
  review: 'review'
};

// 한 단계를 끝낸 뒤 이어질 단계 (복습을 끝내면 수업 완료)
export function stageAfter(kind: PracticeKind): Stage {
  return kind === 'shadowing' ? 'variation' : kind === 'variation' ? 'review' : 'done';
}

export const STAGE_LABEL: Record<Stage, string> = {
  intro: '짧은 수업',
  shadowing: '쉐도잉',
  variation: '변형 연습',
  review: '복습',
  done: '완료',
  // 새 커리큘럼 단계 (기존 수업에는 나오지 않음, 이름표만 맞춰 둔다)
  learn: '설명',
  dialogue: '대화문',
  drill: '드릴',
  roleplay: '롤플레이'
};

// 변형 연습용: 핵심 문장 대신 변형 문장들을 한 줄로 이어 같은 쉐도잉 화면에 태운다
export function toVariationLesson(lesson: Lesson): Lesson {
  const sentences = lesson.sentences.flatMap((s) =>
    s.variations.map((v) => ({
      id: v.id, en: v.en, ko: v.ko, note: '', hintWords: [], vocab: [], variations: [], audio: v.audio
    }))
  );
  return { ...lesson, sentences };
}

export type ProgressMap = ReadonlyMap<string, LessonProgress>;

export function toProgressMap(rows: LessonProgress[]): Map<string, LessonProgress> {
  return new Map(rows.map((r) => [r.lessonId, r]));
}

export function countDone(lessons: { id: string }[], progress: ProgressMap): number {
  return lessons.filter((l) => progress.get(l.id)?.stage === 'done').length;
}

// 이어서 할 수업: 마지막으로 손댄 미완료 수업. 없으면 첫 미완료 수업. 전부 끝났으면 null
export function findResume(lessons: { id: string }[], progress: ProgressMap): { id: string; stage: Stage } | null {
  let latest: LessonProgress | undefined;
  for (const l of lessons) {
    const p = progress.get(l.id);
    if (p && p.stage !== 'done' && (!latest || p.updatedAt > latest.updatedAt)) latest = p;
  }
  if (latest) return { id: latest.lessonId, stage: latest.stage };
  const first = lessons.find((l) => progress.get(l.id)?.stage !== 'done');
  return first ? { id: first.id, stage: 'intro' } : null;
}
