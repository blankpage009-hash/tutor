import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { TwoColumn } from '../components/TwoColumn';
import { contentUrl } from '../content/loader';
import type { NewLesson } from '../content/lessonTypes';
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
  const sp = useDrillSpeaking(plan, steps);
  const saved = useDrillSaved(lesson, sp.log);
  const { step, hf } = sp;
  const handsFree: HandsFreeView = {
    available: sp.voskReady, running: hf.running, step: hf.step, notice: hf.notice,
    onToggle: () => { if (hf.running) hf.stop(); else hf.start(); }
  };
  // 재생 중에 이전·다음을 누르면 일시정지하고 옮긴다. 다시 ▶를 누르면 옮긴 회차부터
  const move = (go: () => void) => { hf.stop(); go(); };
  const goNext = () => nav(newStagePath(lesson.lessonId, nextNewStage('drill')));
  return (
    <TwoColumn list={<DrillList lesson={lesson} plan={plan} current={step} cleared={steps.cleared} />}>
      {steps.finished && <DrillFinish onNext={goNext} />}
      <ShadowingStage sentence={toSentence(step)} label={DRILL_MODE_LABEL[step.stage.mode]} lastLabel="드릴 마치기"
        position={` ${step.rep}회차 · 문장 ${step.drill.id}/${lesson.drills.length}`} saveable
        attempt={sp.attempt} threshold={step.stage.passScore / 100} slowRate={SLOW_RATE}
        passes={steps.cleared.has(step.stepId) ? 1 : 0} required={1}
        canNext={steps.cleared.has(step.stepId)} isLast={steps.index === plan.length - 1} onNext={steps.next}
        onSkip={() => move(steps.skip)} playMode={{ canPrev: steps.index > 0, onPrev: () => move(steps.prev) }}
        onMic={() => undefined} autoOn={false} onAutoOn={() => undefined} autoPending={false}
        saved={saved.saved.has(step.saveId)} saveError={saved.error} onSave={() => { void saved.save(step.saveId); }}
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
