import { Button } from '../../components/Button';
import { MicButton } from '../../components/MicButton';
import type { useShadowingAttempt } from '../shadowing/useShadowingAttempt';
import styles from './Dialogue.module.css';

type Props = {
  attempt: ReturnType<typeof useShadowingAttempt>;
  threshold: number;
  engineNote: string | null;
  micLocked: boolean;
  waiting?: boolean; // 상대가 말하는 중: 모양만 보여 주고 모두 잠근다
  onSkip: () => void;
};

function statusText(p: Props, status: string, message: string | null): string {
  if (p.waiting) return '상대가 말하는 중…';
  if (status === 'listening') return '듣는 중… 다 말하면 저절로 멈춰요';
  if (message) return message;
  if (p.micLocked && p.engineNote) return p.engineNote;
  return '내 차례예요. 탭하고 영어로 말해 보세요';
}

function Result({ p }: { p: Props }) {
  const o = p.attempt.outcome;
  if (!o || (o.status !== 'passed' && o.status !== 'failed')) return null;
  const pct = Math.round(o.judgement.ratio * 100);
  if (o.status === 'passed') return <p className={`${styles.result} ${styles.pass}`} lang="ko">통과! 일치율 {pct}%</p>;
  return (
    <p className={`${styles.result} ${styles.fail}`} lang="ko">
      조금만 더! 일치율 {pct}% (기준 {Math.round(p.threshold * 100)}%) · 들린 말 <span lang="en">“{o.judgement.heard}”</span>
    </p>
  );
}

// 대화문 연습에서 내 줄: 먼저 들려주지 않고 바로 말한다 (사용자 결정 2026-11-17). 듣기는 보통 속도
export function MyLinePanel(p: Props) {
  const o = p.waiting ? null : p.attempt.outcome;
  const listening = o?.status === 'listening';
  // 통과 뒤 다음 상대 줄로 넘어가기 전 잠깐 사이에 또 누르면 마이크가 열린 채 상대 줄이 재생된다
  const locked = p.waiting || o?.status === 'passed';
  return (
    <div className={styles.panel}>
      {!p.waiting && <Result p={p} />}
      <MicButton listening={listening} status={statusText(p, o?.status ?? 'idle', o?.message ?? null)}
        disabled={locked || (p.micLocked && !listening)} onClick={listening ? p.attempt.stop : p.attempt.start} />
      <div className={styles.actions}>
        <Button size="sm" onClick={() => p.attempt.playTutor(1)} disabled={p.waiting || listening}>Listen</Button>
        <Button size="sm" variant="ghost" onClick={p.onSkip} disabled={listening || locked}>Skip</Button>
      </div>
    </div>
  );
}
