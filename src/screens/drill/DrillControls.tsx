import { IconPause, IconPlay, IconReplay, IconSkipNext } from '../../components/icons/icons';
import micStyles from '../../components/MicButton.module.css';
import type { HandsFreeStep } from '../shadowing/handsFreeLoop';
import type { HandsFreeView } from '../shadowing/ShadowingStage';
import styles from './DrillPlayer.module.css';

type Props = {
  handsFree: HandsFreeView;
  busy: boolean; // 이어 말하기 중이거나 듣는 중: 다시 듣기를 잠근다 (마이크가 튜터 소리를 듣지 않게)
  micLocked: boolean;
  engineNote: string | null;
  isLast: boolean;
  onReplay: () => void;
  onNext: () => void;
};

// 가운데 버튼 아래 영문 라벨 (버튼 글자는 디자인대로 영문 — PLAN 7.95 기본값)
const STEP_LABEL: Record<HandsFreeStep, string> = {
  reading: 'Listen',
  preparing: 'Get ready',
  listening: 'Listening…',
  slow: 'Listen slowly'
};

// 라벨 밑 한국어 안내는 멈춘 이유·인식 준비처럼 꼭 읽어야 할 말만
function hintText(p: Props): string | null {
  if (p.handsFree.running) return null;
  if (p.handsFree.notice) return p.handsFree.notice;
  if (p.micLocked && p.engineNote) return p.engineNote;
  return null;
}

// 카드 아래 (디자인 v2 06): 다시 듣기 · 재생/일시정지 · 다음. 가운데는 ▶/⏸ 유지 —
// 누르면 튜터 소리가 먼저 나오므로 마이크 모양이면 헷갈린다 (사용자 결정 2026-11-20)
export function DrillControls(p: Props) {
  const hf = p.handsFree;
  const listening = hf.running && hf.step === 'listening';
  const hint = hintText(p);
  return (
    <div className={styles.panel}>
      <div className={styles.controls}>
        <button type="button" className={styles.side} aria-label="문장 다시 듣기" disabled={p.busy} onClick={p.onReplay}>
          <IconReplay />
        </button>
        {/* 재생 버튼 모양은 마이크 버튼(MicButton.module.css)과 같게 맞춘다 */}
        <button type="button" onClick={hf.onToggle} aria-pressed={hf.running}
          disabled={!hf.running && (p.micLocked || !hf.available)}
          className={`${micStyles.mic} ${listening ? micStyles.listening : ''}`} aria-label={hf.running ? '일시정지' : '재생'}>
          {hf.running ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className={styles.side} aria-label={p.isLast ? '드릴 마치기' : '다음 문장'} onClick={p.onNext}>
          <IconSkipNext />
        </button>
      </div>
      <p className={styles.label} lang="en" aria-live="polite">{hf.running ? STEP_LABEL[hf.step ?? 'reading'] : 'Swipe up · Next'}</p>
      {hint && <p className={styles.hint} lang="ko">{hint}</p>}
    </div>
  );
}
