import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SavedSentence } from '../db/types';
import type { DrillStep } from '../drillPlan';
import { useSettings } from '../settings/SettingsProvider';
import { DrillPlayer } from './drill/DrillPlayer';
import { useDrillSpeaking } from './drill/useDrillSpeaking';
import { useDrillSteps } from './drill/useDrillSteps';
import { fillMissing, loadRows } from './library/useLibrary';
import { SavedFinish } from './library/SavedFinish';
import { toSavedPlan } from './library/savedPlan';
import styles from './library/Library.module.css';

// 보관함에서 "다시 쉐도잉": 저장한 문장을 코스 드릴과 같은 카드 화면(DrillPlayer)으로 한 바퀴 연습한다.
// :startId가 문장 id면 그 문장부터, 'all'이면 처음부터
export function SavedPracticeScreen() {
  const { startId = 'all' } = useParams();
  const { settings } = useSettings();
  const [rows, setRows] = useState<SavedSentence[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadRows()
      .then(fillMissing)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(`보관함을 못 읽었어요: ${String(e)}`));
    return () => { alive = false; };
  }, [startId]);

  const plan = useMemo(
    () => (rows ? toSavedPlan(rows, startId, settings.passThreshold) : undefined),
    [rows, startId, settings.passThreshold]
  );

  if (error) return <p className={styles.note} lang="ko">{error}</p>;
  if (plan === undefined) return <p className={styles.note} lang="ko">불러오는 중…</p>;
  if (plan === null) return <p className={styles.note} lang="ko">연습할 문장이 없어요. 보관함에서 문장을 확인해 주세요.</p>;
  // key: 시작 문장이 바뀌면 통과 기록·위치도 새로 시작하게 (같은 이름의 묶음으로 보이기 때문)
  return <SavedDrill key={startId} plan={plan} />;
}

function SavedDrill({ plan }: { plan: DrillStep[] }) {
  const nav = useNavigate();
  const steps = useDrillSteps(plan.length);
  const sp = useDrillSpeaking(plan, steps);
  const { hf } = sp;
  // 재생 중에 넘기거나 닫으면 일시정지하고 옮긴다 (코스 드릴과 같은 규칙)
  const move = (go: () => void) => { hf.stop(); go(); };
  if (steps.finished) return <SavedFinish total={plan.length} />;
  return (
    <DrillPlayer plan={plan} index={steps.index} sentenceCount={plan.length}
      where={{ left: 'Library', right: `${steps.index + 1} / ${plan.length}` }}
      attempt={sp.attempt} engineNote={sp.engineNote} micLocked={sp.micLocked}
      handsFree={{
        available: sp.voskReady, running: hf.running, step: hf.step, notice: hf.notice,
        onToggle: () => { if (hf.running) hf.stop(); else hf.start(); }
      }}
      // 이미 보관함에 있는 문장이라 북마크는 "저장됨"으로만 보여 준다 (onSave를 주지 않으면 잠긴다).
      // 여기서 해제하면 연습 중인 목록이 흔들려서 막아 둔다
      saved saveError={null}
      onPrev={() => move(steps.prev)} onNext={() => move(steps.skip)}
      onClose={() => move(() => nav('/library'))} />
  );
}
