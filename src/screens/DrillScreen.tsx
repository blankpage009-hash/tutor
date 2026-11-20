import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { IconChevronRight } from '../components/icons/icons';
import { StepComplete } from '../components/StepComplete';
import { useCelebration } from '../components/useCelebration';
import type { NewLesson } from '../content/lessonTypes';
import type { DrillPosition } from '../db/types';
import { buildDrillPlan } from '../drillPlan';
import { newStagePath, nextNewStage } from '../newLessonFlow';
import courseStyles from './courses/Courses.module.css';
import styles from './drill/Drill.module.css';
import { DrillList } from './drill/DrillList';
import { DrillPlayer } from './drill/DrillPlayer';
import { useKeepDrillPosition, useSavedDrillPosition } from './drill/useDrillPosition';
import { useDrillSaved } from './drill/useDrillSaved';
import { useDrillSpeaking } from './drill/useDrillSpeaking';
import { useDrillSteps } from './drill/useDrillSteps';
import { LessonStepBar } from './newLesson/LessonStepBar';
import { useNewLesson } from './newLesson/useNewLesson';
import type { HandsFreeView } from './shadowing/ShadowingStage';

// 새 레슨 STEP 3 드릴(/n/:lessonId/drill): 6문장 × 10회, 바퀴 방식 (drillPlan.ts).
// 첫 화면은 문장 목록, [드릴 시작]을 누르면 카드 화면 (사용자 요청 2026-11-19)
export function DrillScreen() {
  const { lessonId = '' } = useParams();
  const { lesson, error } = useNewLesson(lessonId, 'drill');
  const pos = useSavedDrillPosition(lessonId);
  if (error) return <p className={courseStyles.meta} lang="ko">{error}</p>;
  if (!lesson || pos === undefined) return <p className={courseStyles.meta} lang="ko">불러오는 중…</p>;
  return <DrillBody key={lesson.lessonId} lesson={lesson} initial={pos ?? undefined} />;
}

function DrillBody({ lesson, initial }: { lesson: NewLesson; initial?: DrillPosition }) {
  const nav = useNavigate();
  const [started, setStarted] = useState(false);
  const plan = useMemo(() => buildDrillPlan(lesson), [lesson]);
  const steps = useDrillSteps(plan.length, initial);
  useKeepDrillPosition(lesson, steps);
  const sp = useDrillSpeaking(plan, steps);
  const saved = useDrillSaved(lesson, sp.log);
  const { step, hf } = sp;
  // 이어 말하기가 멈춘 뒤(마이크 반납 후)에 띄운다 — 마이크가 켜진 채 팡파르를 틀면 iOS 통화 모드 잡음
  const celebrate = useCelebration(steps.finished && !hf.running);
  const handsFree: HandsFreeView = {
    available: sp.voskReady, running: hf.running, step: hf.step, notice: hf.notice,
    onToggle: () => { if (hf.running) hf.stop(); else hf.start(); }
  };
  // 재생 중에 넘기거나 닫으면 일시정지하고 옮긴다. 다시 ▶를 누르면 옮긴 카드부터
  const move = (go: () => void) => { hf.stop(); go(); };
  if (steps.finished) {
    return (
      <>
        <DrillFinish lessonId={lesson.lessonId} onNext={() => nav(newStagePath(lesson.lessonId, nextNewStage('drill')))} />
        {celebrate.show && <StepComplete title="Drill Complete!" subtitle="드릴 60회를 마쳤어요" onClose={celebrate.close} />}
      </>
    );
  }
  if (!started) {
    const resume = steps.index > 0 || steps.cleared.size > 0;
    return (
      <DrillList lesson={lesson} fill={steps.index / plan.length} resume={resume} onStart={() => setStarted(true)}
        onRestart={() => { steps.restart(); setStarted(true); }} />
    );
  }
  return (
    <DrillPlayer plan={plan} index={steps.index} sentenceCount={lesson.drills.length}
      attempt={sp.attempt} handsFree={handsFree} engineNote={sp.engineNote} micLocked={sp.micLocked}
      saved={saved.saved.has(step.saveId)} saveError={saved.error} onSave={() => { void saved.toggle(step.saveId); }}
      onPrev={() => move(steps.prev)} onNext={() => move(steps.skip)}
      onClose={() => move(() => setStarted(false))} />
  );
}

function DrillFinish({ lessonId, onNext }: { lessonId: string; onNext: () => void }) {
  return (
    <div className={styles.page}>
      <LessonStepBar lessonId={lessonId} current="drill" fill={1} />
      <p className={styles.done} lang="ko">드릴 60회를 마쳤어요!</p>
      <Button variant="primary" block className={styles.bottom} onClick={onNext}><IconChevronRight />Next: Role-play</Button>
    </div>
  );
}
