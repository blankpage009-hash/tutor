// 새 커리큘럼 레슨 한 개의 흐름(STEP 1 설명 → 2 대화문 → 3 드릴 → 4 롤플레이 → 완료)을 계산하는 순수 모듈.
// 기존 수업 흐름(lessonFlow.ts)과 단계 이름이 달라서 따로 둔다. 진도 저장 칸(LessonProgress)은 같이 쓴다.
import type { Curriculum } from './content/lessonTypes';
import type { LessonProgress, NewLessonStage, NewLessonStep } from './db/types';
import type { ProgressMap } from './lessonFlow';

export type { NewLessonStage, NewLessonStep };

export const NEW_STEPS: NewLessonStep[] = ['learn', 'dialogue', 'drill', 'roleplay'];

export const NEW_STAGES: NewLessonStage[] = ['learn', 'dialogue', 'drill', 'roleplay', 'done'];

export const NEW_STAGE_LABEL: Record<NewLessonStage, string> = {
  learn: '설명',
  dialogue: '대화문',
  drill: '드릴',
  roleplay: '롤플레이',
  done: '완료'
};

export function isNewStage(s: string | undefined): s is NewLessonStage {
  return NEW_STAGES.includes(s as NewLessonStage);
}

// 단계 버튼으로 아무 단계나 갈 수 있어서 "가장 멀리 간 단계"는 뜻이 없다. 마지막으로 들어간 단계를 남기고
// (이어서 하기용), 이미 '완료'한 레슨은 다시 들어가도 '완료' 그대로 (사용자 결정 2026-11-18)
export function enteredNewStage(cur: LessonProgress['stage'] | undefined, step: NewLessonStep): NewLessonStage {
  return cur === 'done' ? 'done' : step;
}

// 끝낸 단계를 더한다. 순서는 늘 설명 → 대화문 → 드릴 → 롤플레이
export function addFinishedStep(steps: NewLessonStep[] | undefined, step: NewLessonStep): NewLessonStep[] {
  const set = new Set([...(steps ?? []), step]);
  return NEW_STEPS.filter((s) => set.has(s));
}

// 아직 안 끝낸 단계. 비어 있으면 레슨 완료 (네 단계를 모두 끝냈을 때만 — 사용자 요청 2026-11-18)
export function missingSteps(steps: NewLessonStep[] | undefined): NewLessonStep[] {
  return NEW_STEPS.filter((s) => !(steps ?? []).includes(s));
}

export function nextNewStage(stage: NewLessonStage): NewLessonStage {
  return NEW_STAGES[Math.min(NEW_STAGES.indexOf(stage) + 1, NEW_STAGES.length - 1)];
}

// 끝낸 레슨은 처음(설명)부터 다시 들어간다
export function newStagePath(lessonId: string, stage: NewLessonStage): string {
  return `/n/${lessonId}/${stage === 'done' ? 'learn' : stage}`;
}

export type NewResume = { id: string; stage: NewLessonStage; title: string; level: string };

function readyLessons(c: Curriculum): Omit<NewResume, 'stage'>[] {
  return c.courses.flatMap((course) => course.levels.flatMap((level) => level.units.flatMap((u) =>
    u.lessons.flatMap((l) => (l.ready && l.id ? [{ id: l.id, title: l.title, level: level.name }] : []))
  )));
}

// 홈 "이어서 할 수업"의 새 레슨: 가장 최근에 하던(완료 전) 레슨, 없으면 목차 순서상 아직 안 끝낸 첫 레슨
export function findNewResume(c: Curriculum, progress: ProgressMap): NewResume | null {
  const lessons = readyLessons(c);
  let latest: { lesson: Omit<NewResume, 'stage'>; stage: NewLessonStage; at: number } | null = null;
  for (const lesson of lessons) {
    const p = progress.get(lesson.id);
    if (!p || !isNewStage(p.stage) || p.stage === 'done') continue;
    if (!latest || p.updatedAt > latest.at) latest = { lesson, stage: p.stage, at: p.updatedAt };
  }
  if (latest) return { ...latest.lesson, stage: latest.stage };
  const first = lessons.find((l) => progress.get(l.id)?.stage !== 'done');
  return first ? { ...first, stage: 'learn' } : null;
}
