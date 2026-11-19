import { useEffect, useRef, type ReactNode } from 'react';
import { ProgressBar } from '../../components/ProgressBar';
import { WordHighlight } from '../../components/WordHighlight';
import { IconBookmark, IconChevronLeft, IconPause, IconPlay, IconReplay, IconSkipNext } from '../../components/icons/icons';
import { DRILL_MODE_LABEL, stageSegments, type DrillStep } from '../../drillPlan';
import micStyles from '../../components/MicButton.module.css';
import { STEP_TEXT, type HandsFreeView } from '../shadowing/ShadowingStage';
import type { useShadowingAttempt } from '../shadowing/useShadowingAttempt';
import styles from './DrillPlayer.module.css';
import { useSwipe } from './useSwipe';

type Attempt = ReturnType<typeof useShadowingAttempt>;

type Props = {
  plan: DrillStep[];
  index: number;
  sentenceCount: number; // 한 바퀴 문장 수 (라벨의 "3/6")
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
};

// 위: 목록으로(앱 공통 ✕는 레슨을 나가는 버튼이라 모양을 달리함) + 4단계 진행 바. 아래: 카드 한 장. 위로 쓸면 다음, 아래로 쓸면 이전 카드 (사용자 요청 2026-11-19)
export function DrillPlayer(p: Props) {
  const step = p.plan[p.index];
  const dir = useSlideDirection(p.index);
  const swipe = useSwipe((d) => (d === 'next' ? p.onNext() : p.onPrev()));
  useArrowKeys(p.onPrev, p.onNext);
  return (
    <div className={styles.player}>
      <header className={styles.top}>
        <button type="button" className={styles.close} onClick={p.onClose} aria-label="문장 목록으로"><IconChevronLeft /></button>
        <div className={styles.bars}>
          {stageSegments(p.plan, p.index).map((s) => (
            <ProgressBar key={s.mode} value={s.fill} label={DRILL_MODE_LABEL[s.mode]} />
          ))}
        </div>
      </header>
      <p className={styles.where} lang="ko">
        {DRILL_MODE_LABEL[step.stage.mode]} · {step.rep}회차 · 문장 {step.drill.id}/{p.sentenceCount}
      </p>
      {/* touch-action: none — 아이폰에서 쓸 때 화면이 같이 밀리지 않게 (CSS) */}
      <div className={styles.swipeArea} {...swipe}>
        <article key={p.index} className={`${styles.card} ${styles[dir]}`}>
          <Card p={p} step={step} />
        </article>
      </div>
      <p className={styles.status} lang="ko" aria-live="polite">{statusText(p)}</p>
      {p.saveError && <p className={styles.error} lang="ko">{p.saveError}</p>}
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

function statusText(p: Props): string {
  const hf = p.handsFree;
  if (hf.running) return STEP_TEXT[hf.step ?? 'reading'];
  if (hf.notice) return hf.notice;
  if (p.micLocked && p.engineNote) return p.engineNote;
  return '재생을 누르면 듣고 말하기가 이어져요';
}

function Card({ p, step }: { p: Props; step: DrillStep }) {
  const busy = p.handsFree.running || p.attempt.outcome?.status === 'listening';
  return (
    <>
      <button type="button" className={styles.save} onClick={p.onSave} disabled={p.saved}
        aria-label={p.saved ? '저장됨' : '문장 저장'}><IconBookmark filled={p.saved} /></button>
      <div className={styles.body}><Sentence p={p} step={step} /></div>
      <div className={styles.controls}>
        <IconButton label="문장 다시 듣기" disabled={busy} onClick={() => p.attempt.playTutor(1)}><IconReplay /></IconButton>
        <PlayToggle hf={p.handsFree} disabled={!p.handsFree.running && (p.micLocked || !p.handsFree.available)} />
        <IconButton label={p.index === p.plan.length - 1 ? '드릴 마치기' : '다음 문장'} onClick={p.onNext}><IconSkipNext /></IconButton>
      </div>
    </>
  );
}

function IconButton({ label, disabled, onClick, children }:
  { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={styles.iconBtn} aria-label={label} disabled={disabled} onClick={onClick}>{children}</button>;
}

// 재생 버튼 모양은 마이크·재생 버튼(MicButton.module.css)과 같게 맞춘다
function PlayToggle({ hf, disabled }: { hf: HandsFreeView; disabled: boolean }) {
  const listening = hf.running && hf.step === 'listening';
  return (
    <button type="button" onClick={hf.onToggle} disabled={disabled} aria-pressed={hf.running}
      className={`${micStyles.mic} ${listening ? micStyles.listening : ''}`}
      aria-label={hf.running ? '일시정지' : '재생'}>
      {hf.running ? <IconPause /> : <IconPlay />}
    </button>
  );
}

// 기억·상황 응답 회차는 통과하기 전까지 영어 정답을 감춘다 (사용자 결정 2026-11-17: 정답은 3번째 실패에만)
function Sentence({ p, step }: { p: Props; step: DrillStep }) {
  const o = p.attempt.outcome;
  const { show } = step.stage;
  const showEn = show === 'en+ko' || show === 'en' || o?.status === 'passed';
  const final = o?.status === 'passed' || o?.status === 'failed';
  return (
    <>
      {show === 'cue' && <p className={styles.cue} lang={step.drill.cue.lang}>{step.drill.cue.text}</p>}
      {o && showEn && <WordHighlight words={o.judgement.words} nextIndex={o.judgement.nextIndex} final={final} />}
      {!showEn && <p className={styles.hidden} lang="ko">영어로 말해 보세요</p>}
      {(show === 'en+ko' || show === 'ko') && <p className={styles.ko} lang="ko">{step.drill.ko}</p>}
      <Result p={p} />
    </>
  );
}

function Result({ p }: { p: Props }) {
  const o = p.attempt.outcome;
  if (!o || (o.status !== 'passed' && o.status !== 'failed')) return null;
  const pct = Math.round(o.judgement.ratio * 100);
  if (o.status === 'passed') return <p className={styles.pass} lang="ko">통과! 일치율 {pct}%</p>;
  return (
    <p className={styles.fail} lang="ko">
      조금만 더! 일치율 {pct}%{o.judgement.heard && <> · 들린 말 <span lang="en">“{o.judgement.heard}”</span></>}
    </p>
  );
}
