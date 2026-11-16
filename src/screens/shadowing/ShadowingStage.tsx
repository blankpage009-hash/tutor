import { Button } from '../../components/Button';
import { MicButton } from '../../components/MicButton';
import { ProgressBar } from '../../components/ProgressBar';
import { WordHighlight } from '../../components/WordHighlight';
import type { Sentence } from '../../content/types';
import { playSource, unlockAudio } from '../../speech/audioPlayer';
import type { HandsFreeStep } from './handsFreeLoop';
import styles from './Shadowing.module.css';
import type { useShadowingAttempt } from './useShadowingAttempt';

type Attempt = ReturnType<typeof useShadowingAttempt>;

type Props = {
  sentence: Sentence;
  position: string; // "문장 1 / 3"
  attempt: Attempt;
  threshold: number;
  slowRate: number;
  passes: number; // 이 문장을 지금까지 통과한 횟수
  required: number; // 다음 문장으로 가려면 필요한 통과 횟수
  canNext: boolean;
  isLast: boolean;
  onNext: () => void;
  onMic: () => void;
  saved: boolean;
  saveError: string | null;
  onSave: () => void;
  autoOn: boolean;
  onAutoOn: (on: boolean) => void;
  autoPending: boolean;
  engineNote: string | null; // 앱 안 인식 준비 상태 안내 (준비 중·실패)
  micLocked: boolean; // 인식 준비가 끝나기 전에는 마이크를 못 누르게
  handsFree: HandsFreeView;
};

export type HandsFreeView = {
  available: boolean; // 앱 안 인식이 준비됐을 때만
  running: boolean;
  step: HandsFreeStep | null;
  notice: string | null; // 멈춘 이유
  onToggle: () => void;
};

const STEP_TEXT: Record<HandsFreeStep, string> = {
  reading: '튜터가 읽어요… 듣고 바로 따라 말해 보세요',
  listening: '따라 말해 보세요 · 듣는 중',
  slow: '느리게 다시 들려줄게요… 끝나면 다시 말해 보세요'
};

function micStatus(p: Props, status: string, message: string | null): string {
  if (p.handsFree.running) return STEP_TEXT[p.handsFree.step ?? 'reading'];
  if (status === 'listening') return '듣는 중… 다 말하면 저절로 멈춰요';
  if (message) return message;
  if (p.micLocked && p.engineNote) return p.engineNote;
  return '탭하고 영어로 따라 말해 보세요';
}

function PassLine({ p, pct }: { p: Props; pct: number }) {
  const more = p.passes < p.required;
  const tail = more ? ` · ${p.passes}/${p.required}번 — 한 번 더 말해 보세요`
    : p.autoPending ? ' · 곧 다음 문장으로 넘어가요' : '';
  return <p className={styles.pass} lang="ko">통과! 일치율 {pct}%{tail}</p>;
}

function FailLine({ p, pct }: { p: Props; pct: number }) {
  const heard = p.attempt.outcome?.judgement.heard;
  return (
    <div className={styles.fail} lang="ko">
      <p className={styles.failHead}>조금만 더! 일치율 {pct}% (기준 {Math.round(p.threshold * 100)}%)</p>
      {heard && <p className={styles.failDetail}>들린 말: <span lang="en">“{heard}”</span></p>}
      <p className={styles.failDetail}>
        {p.attempt.replaying ? '느리게 다시 들려줄게요…' : '틀린 단어를 확인하고 다시 말해 보세요'}
      </p>
    </div>
  );
}

function ResultLine({ p }: { p: Props }) {
  const o = p.attempt.outcome;
  if (!o || (o.status !== 'passed' && o.status !== 'failed')) return null;
  const pct = Math.round(o.judgement.ratio * 100);
  return o.status === 'passed' ? <PassLine p={p} pct={pct} /> : <FailLine p={p} pct={pct} />;
}

function Extras({ p, listening }: { p: Props; listening: boolean }) {
  const playMine = () => {
    unlockAudio();
    if (p.attempt.myVoice) playSource(p.attempt.myVoice).catch(() => undefined);
  };
  return (
    <>
      <div className={styles.actions}>
        <Button size="sm" onClick={() => p.attempt.playTutor(1)} disabled={listening}>문장 다시 듣기</Button>
        <Button size="sm" onClick={() => p.attempt.playTutor(p.slowRate)} disabled={listening}>느리게 듣기</Button>
        {p.attempt.myVoice && <Button size="sm" onClick={playMine} disabled={listening}>내 목소리 듣기</Button>}
        <Button size="sm" onClick={p.onSave} disabled={p.saved}>{p.saved ? '저장됨' : '문장 저장'}</Button>
      </div>
      {p.saveError && <p className={styles.hint} lang="ko">{p.saveError}</p>}
      <label className={styles.toggle} lang="ko">
        <input type="checkbox" checked={p.autoOn} onChange={(e) => p.onAutoOn(e.target.checked)} />
        자동 넘기기 (통과하면 1.5초 뒤 다음 문장)
      </label>
    </>
  );
}

// 손 안 대고 이어 말하기 버튼과 멈춘 이유
function HandsFreeControl({ hf }: { hf: HandsFreeView }) {
  if (!hf.available && !hf.running) return null;
  return (
    <>
      <Button variant={hf.running ? 'secondary' : 'primary'} block onClick={hf.onToggle}>
        {hf.running ? '이어 말하기 멈추기' : '손 안 대고 이어 말하기'}
      </Button>
      {!hf.running && hf.notice && <p className={styles.hint} lang="ko">{hf.notice}</p>}
    </>
  );
}

export function ShadowingStage(p: Props) {
  const o = p.attempt.outcome;
  const hf = p.handsFree;
  // 이어 말하기 중에는 튜터가 읽는 동안에도 다른 버튼을 잠근다 (재생이 바뀌면 순서가 꼬인다)
  const listening = o?.status === 'listening' || hf.running;
  const final = o?.status === 'passed' || o?.status === 'failed';
  return (
    <div className={styles.stage}>
      <p className={styles.eyebrow} lang="ko">쉐도잉 · {p.position} · 통과 {Math.min(p.passes, p.required)}/{p.required}</p>
      <ProgressBar value={o?.judgement.ratio ?? 0} label="맞힌 단어 비율" />
      {o && <WordHighlight words={o.judgement.words} nextIndex={o.judgement.nextIndex} final={final} />}
      <p className={styles.ko} lang="ko">{p.sentence.ko}</p>
      <ResultLine p={p} />
      <MicButton listening={hf.running ? hf.step === 'listening' : listening}
        status={micStatus(p, o?.status ?? 'idle', o?.message ?? null)}
        disabled={p.micLocked && !listening}
        onClick={hf.running ? hf.onToggle : listening ? p.attempt.stop : p.onMic} />
      <HandsFreeControl hf={hf} />
      <Extras p={p} listening={listening} />
      <Button variant="primary" block disabled={!p.canNext || listening} onClick={p.onNext}>
        {p.isLast ? '수업 마치기' : '다음 문장'}
      </Button>
    </div>
  );
}
