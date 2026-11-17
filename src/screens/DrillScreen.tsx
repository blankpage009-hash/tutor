import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { TwoColumn } from '../components/TwoColumn';
import { contentUrl } from '../content/loader';
import type { NewLesson } from '../content/lessonTypes';
import { DEFAULT_SETTINGS } from '../db/types';
import { buildDrillPlan, DRILL_MODE_LABEL, toSentence, type DrillStep } from '../drillPlan';
import { newStagePath, nextNewStage } from '../newLessonFlow';
import { playAudio, unlockAudio } from '../speech/audioPlayer';
import courseStyles from './courses/Courses.module.css';
import styles from './drill/Drill.module.css';
import { DrillList } from './drill/DrillList';
import { useDrillSaved } from './drill/useDrillSaved';
import { useDrillSpeaking } from './drill/useDrillSpeaking';
import { useDrillSteps } from './drill/useDrillSteps';
import { SLOW_RATE } from './newLesson/useNewSpeaking';
import { useNewLesson } from './newLesson/useNewLesson';
import { ShadowingStage, type HandsFreeView } from './shadowing/ShadowingStage';
import { useAutoAdvance } from './shadowing/useLessonSteps';

// 새 레슨 STEP 3 드릴(/n/:lessonId/drill): 6문장 × 10회, 바퀴 방식 (drillPlan.ts)
export function DrillScreen() {
  const { lessonId = '' } = useParams();
  const { lesson, error } = useNewLesson(lessonId, 'drill');
  if (error) return <p className={courseStyles.meta} lang="ko">{error}</p>;
  if (!lesson) return <p className={courseStyles.meta} lang="ko">불러오는 중…</p>;
  return <DrillBody key={lesson.lessonId} lesson={lesson} />;
}

// 상황 응답 회차의 상황: 영어 cue만 소리가 있다
function cueOf(step: DrillStep) {
  if (step.stage.mode !== 'respond') return undefined;
  const { cue } = step.drill;
  const audio = cue.audio;
  const onPlay = audio ? () => { unlockAudio(); playAudio(contentUrl(audio), 1).catch(() => undefined); } : undefined;
  return { text: cue.text, lang: cue.lang, onPlay };
}

function DrillBody({ lesson }: { lesson: NewLesson }) {
  const nav = useNavigate();
  const plan = useMemo(() => buildDrillPlan(lesson), [lesson]);
  const steps = useDrillSteps(plan.length);
  // 앱을 다시 열면 꺼짐으로 돌아간다 (쉐도잉 화면과 같음, 기억은 설정 화면과 함께 Phase 7)
  const [autoOn, setAutoOn] = useState(DEFAULT_SETTINGS.autoAdvance);
  const auto = useAutoAdvance(autoOn, plan[steps.index]?.stepId, steps.next);
  const sp = useDrillSpeaking(plan, steps, () => { if (autoOn) auto.schedule(); });
  const saved = useDrillSaved(lesson, sp.log);
  const { step, hf } = sp;
  const handsFree: HandsFreeView = {
    available: sp.voskReady, running: hf.running, step: hf.step, notice: hf.notice,
    onToggle: () => { auto.cancel(); if (hf.running) hf.stop(); else hf.start(); }
  };
  const goNext = () => nav(newStagePath(lesson.lessonId, nextNewStage('drill')));
  return (
    <TwoColumn list={<DrillList lesson={lesson} plan={plan} current={step} cleared={steps.cleared} />}>
      {steps.finished && <DrillFinish onNext={goNext} />}
      <ShadowingStage sentence={toSentence(step)} label={DRILL_MODE_LABEL[step.stage.mode]} lastLabel="드릴 마치기"
        position={` ${step.rep}회차 · 문장 ${step.drill.id}/${lesson.drills.length}`} saveable
        attempt={sp.attempt} threshold={step.stage.passScore / 100} slowRate={SLOW_RATE}
        passes={steps.cleared.has(step.stepId) ? 1 : 0} required={1}
        canNext={steps.cleared.has(step.stepId)} isLast={steps.index === plan.length - 1} onNext={steps.next}
        onSkip={() => { auto.cancel(); steps.skip(); }} skipLast
        onMic={() => { auto.cancel(); void sp.attempt.start(); }}
        saved={saved.saved.has(step.saveId)} saveError={saved.error} onSave={() => { void saved.save(step.saveId); }}
        autoOn={autoOn} onAutoOn={setAutoOn} autoPending={auto.pending}
        engineNote={sp.engineNote} micLocked={sp.micLocked} handsFree={handsFree} onSecretTap={() => undefined}
        show={step.stage.show} cue={cueOf(step)} hideTutorButtons={step.stage.mode !== 'repeat'} />
    </TwoColumn>
  );
}

function DrillFinish({ onNext }: { onNext: () => void }) {
  return (
    <>
      <p className={styles.done} lang="ko">드릴 60회를 마쳤어요!</p>
      <Button variant="primary" block onClick={onNext}>롤플레이로</Button>
    </>
  );
}
