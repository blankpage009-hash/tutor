import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { StepComplete } from '../components/StepComplete';
import { useCelebration } from '../components/useCelebration';
import type { SavedSentence } from '../db/types';
import type { DrillStep } from '../drillPlan';
import { useSettings } from '../settings/SettingsProvider';
import { DrillPlayer } from './drill/DrillPlayer';
import { useDrillSpeaking } from './drill/useDrillSpeaking';
import { useDrillSteps } from './drill/useDrillSteps';
import { fillMissing, loadRows } from './library/useLibrary';
import { peekPracticeLaunch, takePracticeLaunch } from './library/practiceLaunch';
import { loadPracticeOptions } from './library/practiceOptions';
import { SavedFinish } from './library/SavedFinish';
import { toSavedPlan } from './library/savedPlan';
import { useListenLoop } from './library/useListenLoop';
import styles from './library/Library.module.css';

// 보관함에서 "다시 쉐도잉": 저장한 문장을 코스 드릴과 같은 카드 화면(DrillPlayer)으로 한 바퀴 연습한다.
// :startId가 문장 id면 그 문장부터, 'all'이면 처음부터,
// 'selected'면 주소의 ?id=…로 고른 문장만 (보관함에서 길게 눌러 고르기, 사용자 요청 2026-11-20)
export function SavedPracticeScreen() {
  const { startId = 'all' } = useParams();
  const [params] = useSearchParams();
  const pickedKey = startId === 'selected' ? params.getAll('id').join('\n') : '';
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

  // 반복·순서·듣기만은 보관함 화면에서 고른 값 (기기에 기억된 것). 화면을 여는 순간 한 번만 읽는다
  const [opts] = useState(loadPracticeOptions);
  const plan = useMemo(() => {
    if (!rows) return undefined;
    const picked = new Set(pickedKey.split('\n'));
    const usable = startId === 'selected' ? rows.filter((r) => picked.has(r.id)) : rows;
    return toSavedPlan(usable, startId, settings.passThreshold, { reps: opts.reps, shuffle: opts.order === 'random' });
  }, [rows, startId, pickedKey, settings.passThreshold, opts]);

  if (error) return <p className={styles.note} lang="ko">{error}</p>;
  if (plan === undefined) return <p className={styles.note} lang="ko">불러오는 중…</p>;
  if (plan === null) return <p className={styles.note} lang="ko">연습할 문장이 없어요. 보관함에서 문장을 확인해 주세요.</p>;
  // key: 시작 문장이 바뀌면 통과 기록·위치도 새로 시작하게 (같은 이름의 묶음으로 보이기 때문)
  return <SavedDrill key={`${startId}:${pickedKey}`} plan={plan} listening={opts.listening} />;
}

// 보관함에서 탭해 들어왔으면(바통이 있으면) ▶를 누르지 않아도 시작한다 (사용자 요청 2026-11-21).
// 말하기는 인식 엔진이 준비된 뒤에 시작. 새로고침·뒤로 가기로 열린 화면은 바통이 없어 그대로 ▶를 기다린다
function useAutoStart(ready: boolean, begin: (ctx: AudioContext | null) => void) {
  const [launch] = useState(() => peekPracticeLaunch()); // 보기만: 개발 모드에서 두 번 그려져도 바통이 남게
  const done = useRef(false);
  const latest = useRef(begin);
  latest.current = begin;
  useEffect(() => {
    if (!launch || done.current || !ready) return;
    // 한 박자 늦게: 개발 모드(StrictMode)가 화면을 붙였다 떼었다 해도 한 번만, 멈춤 없이 시작하게
    const t = setTimeout(() => {
      done.current = true;
      const ticket = takePracticeLaunch();
      if (ticket) latest.current(ticket.ctx);
    }, 0);
    return () => clearTimeout(t);
  }, [launch, ready]);
}

// listening: 켜져 있으면 ▶가 말하기 없이 카드 소리만 차례로 들려준다 (사용자 요청 2026-11-21)
function SavedDrill({ plan, listening }: { plan: DrillStep[]; listening: boolean }) {
  const nav = useNavigate();
  const steps = useDrillSteps(plan.length);
  const sp = useDrillSpeaking(plan, steps);
  const listen = useListenLoop(plan, steps, sp.handsFreeActive);
  const { hf } = sp;
  // 이어 말하기·듣기가 멈춘 뒤(마이크 반납 후)에 띄운다 — 마이크가 켜진 채 소리를 틀면 iOS 통화 모드 잡음 (코스 드릴과 같은 규칙)
  const celebrate = useCelebration(steps.finished && !hf.running && !listen.running);
  useAutoStart(listening || (sp.voskReady && !sp.micLocked), (ctx) => {
    if (listening) { ctx?.close().catch(() => undefined); listen.start(); return; }
    sp.armLeadIn(); // 코스 드릴 시작과 같이 1초 쉬고 튜터가 읽는다
    hf.start(ctx);
  });
  // 재생 중에 넘기거나 닫으면 일시정지하고 옮긴다 (코스 드릴과 같은 규칙)
  const move = (go: () => void) => { hf.stop(); listen.stop(); go(); };
  // 반복하면 카드 수가 문장 수 × 반복이라, 위 표시는 문장 기준으로 보여 준다
  const reps = plan[0].stage.reps.length;
  const sentenceTotal = plan.length / reps;
  const cur = plan[Math.min(steps.index, plan.length - 1)];
  const label = listening ? 'Listening' : 'Library';
  if (steps.finished) {
    return (
      <>
        <SavedFinish total={sentenceTotal} />
        {celebrate.show && <StepComplete title="Practice Complete!" onClose={celebrate.close} />}
      </>
    );
  }
  return (
    <DrillPlayer plan={plan} index={steps.index} sentenceCount={sentenceTotal}
      where={{ left: reps > 1 ? `${label} · ${cur.rep}/${reps}` : label, right: `${cur.drill.id} / ${sentenceTotal}` }}
      // 듣기만은 마이크를 쓰지 않아 인식 엔진 준비를 기다리지 않는다
      attempt={sp.attempt} engineNote={listening ? null : sp.engineNote} micLocked={listening ? false : sp.micLocked}
      handsFree={listening ? listen : {
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
