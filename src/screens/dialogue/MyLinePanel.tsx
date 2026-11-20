import { IconReplay, IconSkipNext } from '../../components/icons/icons';
import { MicButton } from '../../components/MicButton';
import { ResultMark } from '../../components/ResultMark';
import type { useShadowingAttempt } from '../shadowing/useShadowingAttempt';
import styles from './Dialogue.module.css';

type Props = {
  attempt: ReturnType<typeof useShadowingAttempt>;
  threshold: number;
  engineNote: string | null;
  micLocked: boolean;
  waiting?: boolean; // 상대가 말하는 중(또는 다시 듣기 중): 모양만 보여 주고 모두 잠근다
  onSkip: () => void;
};

// 마이크 아래 영문 라벨 (버튼 글자는 디자인대로 영문 — PLAN 7.95 기본값)
function statusLabel(p: Props, status: string): string {
  if (p.waiting) return 'Partner speaking';
  if (status === 'listening') return 'Listening…';
  if (status === 'passed') return 'Pass';
  if (status === 'failed') return 'Try again';
  return 'Your turn';
}

// 라벨 밑 한국어 안내: 듣는 중 요령, 오류·인식 준비 같은 꼭 읽어야 할 말만
function hintText(p: Props, status: string, message: string | null): string | null {
  if (p.waiting) return null;
  if (status === 'listening') return '다 말하면 저절로 멈춰요';
  if (message) return message;
  if (p.micLocked && p.engineNote) return p.engineNote;
  return null;
}

function Result({ p }: { p: Props }) {
  const o = p.attempt.outcome;
  if (!o || (o.status !== 'passed' && o.status !== 'failed')) return null;
  const pct = Math.round(o.judgement.ratio * 100);
  if (o.status === 'passed') return <p className={`${styles.result} ${styles.pass}`} lang="ko"><ResultMark pass />통과! 일치율 {pct}%</p>;
  return (
    <p className={`${styles.result} ${styles.fail}`} lang="ko">
      <ResultMark pass={false} />조금만 더! 일치율 {pct}% (기준 {Math.round(p.threshold * 100)}%) · 들린 말 <span lang="en">“{o.judgement.heard}”</span>
    </p>
  );
}

// 대화문 연습 아래쪽: 다시하기(내 줄 듣기, 보통 속도) · 마이크 · 건너뛰기. 내 줄은 먼저 들려주지 않고 바로 말한다 (사용자 결정 2026-11-17)
export function MyLinePanel(p: Props) {
  const o = p.waiting ? null : p.attempt.outcome;
  const status = o?.status ?? 'idle';
  const listening = status === 'listening';
  // 통과 뒤 다음 상대 줄로 넘어가기 전 잠깐 사이에 또 누르면 마이크가 열린 채 상대 줄이 재생된다
  const locked = p.waiting || status === 'passed';
  const hint = hintText(p, status, o?.message ?? null);
  return (
    <div className={styles.panel}>
      {!p.waiting && <Result p={p} />}
      <div className={styles.controls}>
        <button type="button" className={styles.side} onClick={() => p.attempt.playTutor(1)}
          disabled={p.waiting || listening} aria-label="내 줄 들어 보기"><IconReplay /></button>
        <MicButton tone="label" listening={listening} status={statusLabel(p, status)}
          disabled={locked || (p.micLocked && !listening)} onClick={listening ? p.attempt.stop : p.attempt.start} />
        <button type="button" className={styles.side} onClick={p.onSkip}
          disabled={listening || locked} aria-label="이 줄 건너뛰기"><IconSkipNext /></button>
      </div>
      {hint && <p className={styles.hint} lang="ko">{hint}</p>}
    </div>
  );
}
