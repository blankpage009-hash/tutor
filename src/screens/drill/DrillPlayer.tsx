import { useEffect, useRef } from 'react';
import { DRILL_MODE_LABEL, type DrillStep } from '../../drillPlan';
import type { HandsFreeView } from '../shadowing/ShadowingStage';
import type { useShadowingAttempt } from '../shadowing/useShadowingAttempt';
import { DrillCard } from './DrillCard';
import { DrillControls } from './DrillControls';
import { DrillModeBar } from './DrillModeBar';
import styles from './DrillPlayer.module.css';
import { useSwipe } from './useSwipe';

type Attempt = ReturnType<typeof useShadowingAttempt>;

type Props = {
  plan: DrillStep[];
  index: number;
  sentenceCount: number; // 한 바퀴 문장 수 (오른쪽 "3 / 6")
  attempt: Attempt;
  handsFree: HandsFreeView;
  engineNote: string | null;
  micLocked: boolean;
  saved: boolean;
  saveError: string | null;
  onSave: () => void;
  onPrev: () => void;
  onNext: () => void; // 마지막 카드에서는 드릴을 마친다
  onClose: () => void;
  where?: { left: string; right: string }; // 카드 위 줄. 없으면 "READ · ROUND 5" ↔ "3 / 6" (보관함 연습은 회차가 없어 따로 준다)
};

// 드릴 카드 화면 (디자인 v2 06): 모드 막대, 회차 줄, 카드 한 장, 아래 버튼.
// 카드를 위로 쓸면 다음, 아래로 쓸면 이전 카드 (사용자 요청 2026-11-19)
export function DrillPlayer(p: Props) {
  const step = p.plan[p.index];
  const dir = useSlideDirection(p.index);
  const swipe = useSwipe((d) => (d === 'next' ? p.onNext() : p.onPrev()));
  useArrowKeys(p.onPrev, p.onNext);
  const where = p.where ?? { left: `${DRILL_MODE_LABEL[step.stage.mode]} · Round ${step.rep}`, right: `${step.drill.id} / ${p.sentenceCount}` };
  const busy = p.handsFree.running || p.attempt.outcome?.status === 'listening';
  return (
    <div className={styles.player}>
      <DrillModeBar plan={p.plan} index={p.index} onClose={p.onClose} />
      <div className={styles.where}>
        <span className={styles.whereNow}>{where.left}</span>
        <span>{where.right}</span>
      </div>
      {/* touch-action: none — 아이폰에서 쓸 때 화면이 같이 밀리지 않게 (CSS) */}
      <div className={styles.swipeArea} {...swipe}>
        <article key={p.index} className={`${styles.card} ${styles[dir]}`}>
          <DrillCard step={step} outcome={p.attempt.outcome} saved={p.saved} onSave={p.onSave} />
        </article>
      </div>
      {p.saveError && <p className={styles.error} lang="ko">{p.saveError}</p>}
      <DrillControls handsFree={p.handsFree} busy={busy} micLocked={p.micLocked} engineNote={p.engineNote}
        isLast={p.index === p.plan.length - 1} onReplay={() => p.attempt.playTutor(1)} onNext={p.onNext} />
    </div>
  );
}

// 카드가 바뀔 때만 방향을 정한다. 그 뒤 다른 이유로 다시 그려져도 애니메이션이 끊기지 않게 ref에 들고 있는다
function useSlideDirection(index: number): 'none' | 'fromBelow' | 'fromAbove' {
  const last = useRef(index);
  const dir = useRef<'none' | 'fromBelow' | 'fromAbove'>('none');
  if (index !== last.current) {
    dir.current = index > last.current ? 'fromBelow' : 'fromAbove';
    last.current = index;
  }
  return dir.current;
}

// 데스크톱에서 쓸기 대신 확인할 수 있게 ↑↓ 키도 받는다
function useArrowKeys(onPrev: () => void, onNext: () => void) {
  const latest = useRef({ onPrev, onNext });
  latest.current = { onPrev, onNext };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') latest.current.onPrev();
      else if (e.key === 'ArrowUp') latest.current.onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
