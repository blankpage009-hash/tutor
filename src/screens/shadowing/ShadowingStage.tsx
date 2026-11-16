import { Button } from '../../components/Button';
import { MicButton } from '../../components/MicButton';
import { ProgressBar } from '../../components/ProgressBar';
import { WordHighlight } from '../../components/WordHighlight';
import type { Sentence } from '../../content/types';
import { playSource, unlockAudio } from '../../speech/audioPlayer';
import styles from './Shadowing.module.css';
import type { useShadowingAttempt } from './useShadowingAttempt';

type Attempt = ReturnType<typeof useShadowingAttempt>;

type Props = {
  sentence: Sentence;
  position: string; // "문장 1 / 3"
  attempt: Attempt;
  threshold: number;
  slowRate: number;
  canNext: boolean;
  isLast: boolean;
  onNext: () => void;
  separate: { show: boolean; active: boolean; toggle: () => void };
};

function micStatus(status: string, message: string | null): string {
  if (status === 'listening') return '듣는 중… 다 말하면 저절로 멈춰요. 탭하면 멈춰요';
  if (message) return message;
  return '탭하고 영어로 따라 말해 보세요';
}

function ResultLine({ attempt, threshold }: { attempt: Attempt; threshold: number }) {
  const o = attempt.outcome;
  if (!o || (o.status !== 'passed' && o.status !== 'failed')) return null;
  const pct = Math.round(o.judgement.ratio * 100);
  return o.status === 'passed'
    ? <p className={styles.pass} lang="ko">통과! 일치율 {pct}%</p>
    : <p className={styles.fail} lang="ko">조금만 더! 일치율 {pct}% (기준 {Math.round(threshold * 100)}%) — 틀린 단어를 확인하고 다시 해 보세요</p>;
}

export function ShadowingStage(p: Props) {
  const o = p.attempt.outcome;
  const listening = o?.status === 'listening';
  const final = o?.status === 'passed' || o?.status === 'failed';
  const playMine = () => {
    unlockAudio();
    if (p.attempt.myVoice) playSource(p.attempt.myVoice).catch(() => undefined);
  };
  return (
    <div className={styles.stage}>
      <p className={styles.eyebrow} lang="ko">쉐도잉 · {p.position}</p>
      <ProgressBar value={o?.judgement.ratio ?? 0} label="맞힌 단어 비율" />
      {o && <WordHighlight words={o.judgement.words} nextIndex={o.judgement.nextIndex} final={final} />}
      <p className={styles.ko} lang="ko">{p.sentence.ko}</p>
      <ResultLine attempt={p.attempt} threshold={p.threshold} />
      <MicButton listening={listening} status={micStatus(o?.status ?? 'idle', o?.message ?? null)}
        onClick={listening ? p.attempt.stop : p.attempt.start} />
      <div className={styles.actions}>
        <Button size="sm" onClick={() => p.attempt.playTutor(1)} disabled={listening}>문장 다시 듣기</Button>
        <Button size="sm" onClick={() => p.attempt.playTutor(p.slowRate)} disabled={listening}>느리게 듣기</Button>
        {p.separate.show && (
          <Button size="sm" onClick={p.separate.toggle} disabled={listening}>
            {p.separate.active ? '녹음 멈추기' : '내 목소리 녹음'}
          </Button>
        )}
        {p.attempt.myVoice && <Button size="sm" onClick={playMine} disabled={listening}>내 목소리 듣기</Button>}
      </div>
      <Button variant="primary" block disabled={!p.canNext || listening} onClick={p.onNext}>
        {p.isLast ? '수업 마치기' : '다음 문장'}
      </Button>
    </div>
  );
}
