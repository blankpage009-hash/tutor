import { Button } from '../../components/Button';
import { MicButton } from '../../components/MicButton';
import { PlayButton } from '../../components/PlayButton';
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
  label: string; // 단계 이름 (쉐도잉·변형 연습·복습)
  saveable: boolean; // 변형 문장은 보관함에 저장하지 않는다 (보관함은 핵심 문장 id 기준)
  lastLabel: string; // 마지막 문장의 "다음" 버튼 글자
  position: string; // "문장 1 / 3"
  attempt: Attempt;
  threshold: number;
  slowRate: number;
  passes: number; // 이 문장을 지금까지 통과한 횟수
  required: number; // 다음 문장으로 가려면 필요한 통과 횟수
  canNext: boolean;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void; // 통과하지 않고 다음 문장으로 (통과로 세지 않음)
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
  onSecretTap: () => void; // 맨 위 "문장 1 / 3" 글자 누름 (5번이면 진단 패널 열기/닫기)
  // 아래는 드릴용(Phase 5.5). 안 주면 지금처럼 영어+한국어, 듣기 버튼 모두 보임
  show?: 'en+ko' | 'en' | 'ko' | 'cue';
  cue?: { text: string; lang: 'en' | 'ko'; onPlay?: () => void }; // 상황 응답의 상황(영어 cue만 소리 있음)
  hideTutorButtons?: boolean; // 정답이 들려 버리는 회차(보고·기억·상황)에서 "다시 듣기" 숨김
  // 드릴: 마이크 버튼 + 이어 말하기 버튼을 재생 버튼 하나로, 다음·건너뛰기를 이전·다음으로 (사용자 요청 2026-11-17).
  // 다음은 onSkip(통과 안 해도 넘어감, 마지막이면 끝)
  playMode?: { canPrev: boolean; onPrev: () => void };
};

export type HandsFreeView = {
  available: boolean; // 앱 안 인식이 준비됐을 때만
  running: boolean;
  step: HandsFreeStep | null;
  notice: string | null; // 멈춘 이유
  onToggle: () => void;
};

export const STEP_TEXT: Record<HandsFreeStep, string> = {
  reading: '튜터가 읽어요… 듣고 바로 따라 말해 보세요',
  preparing: '마이크 준비 중… 잠깐만요',
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
        {!p.hideTutorButtons && <>
          <Button size="sm" onClick={() => p.attempt.playTutor(1)} disabled={listening}>문장 다시 듣기</Button>
          <Button size="sm" onClick={() => p.attempt.playTutor(p.slowRate)} disabled={listening}>느리게 듣기</Button>
        </>}
        {p.cue?.onPlay && <Button size="sm" onClick={p.cue.onPlay} disabled={listening}>상황 다시 듣기</Button>}
        {p.attempt.myVoice && <Button size="sm" onClick={playMine} disabled={listening}>내 목소리 듣기</Button>}
        {p.saveable && <Button size="sm" onClick={p.onSave} disabled={p.saved}>{p.saved ? '저장됨' : '문장 저장'}</Button>}
      </div>
      {p.saveError && <p className={styles.hint} lang="ko">{p.saveError}</p>}
      {/* 재생 버튼 방식에서는 통과하면 알아서 넘어가므로 스위치가 필요 없다 */}
      {!p.playMode && (
        <label className={styles.toggle} lang="ko">
          <input type="checkbox" checked={p.autoOn} onChange={(e) => p.onAutoOn(e.target.checked)} />
          자동 넘기기 (통과하면 1.5초 뒤 다음 문장)
        </label>
      )}
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

// 기억·상황 응답 회차는 통과하기 전까지 영어 정답을 감춘다. 틀렸을 때 보여 주면 3번째 실패 전에
// 정답을 알려 주는 셈이라 통과했을 때만 보인다 (사용자 결정 2026-11-17: 정답은 3번째 실패에만)
function SentenceView({ p, final }: { p: Props; final: boolean }) {
  const o = p.attempt.outcome;
  const show = p.show ?? 'en+ko';
  const showEn = show === 'en+ko' || show === 'en' || o?.status === 'passed';
  return (
    <>
      {p.cue && <p className={styles.cue} lang={p.cue.lang}>{p.cue.text}</p>}
      {o && showEn && <WordHighlight words={o.judgement.words} nextIndex={o.judgement.nextIndex} final={final} />}
      {!showEn && <p className={styles.hidden} lang="ko">영어로 말해 보세요</p>}
      {(show === 'en+ko' || show === 'ko') && <p className={styles.ko} lang="ko">{p.sentence.ko}</p>}
    </>
  );
}

function playStatus(p: Props): string {
  const hf = p.handsFree;
  if (hf.running) return STEP_TEXT[hf.step ?? 'reading'];
  if (hf.notice) return hf.notice;
  if (p.micLocked && p.engineNote) return p.engineNote;
  return '재생을 누르면 듣고 말하기가 이어져요';
}

// 재생 버튼 방식(드릴): 재생 중에도 이전·다음을 누를 수 있다 — 화면 쪽에서 일시정지한 뒤 옮긴다
function PlayControls({ p }: { p: Props }) {
  const hf = p.handsFree;
  return (
    <PlayButton playing={hf.running} listening={hf.running && hf.step === 'listening'} status={playStatus(p)}
      disabled={!hf.running && (p.micLocked || !hf.available)} onClick={hf.onToggle} />
  );
}

function PrevNext({ p, onPrev, canPrev }: { p: Props; onPrev: () => void; canPrev: boolean }) {
  return (
    <div className={styles.nav}>
      <Button block disabled={!canPrev} onClick={onPrev}>◀ 이전</Button>
      <Button variant="primary" block onClick={p.onSkip}>{p.isLast ? p.lastLabel : '다음 ▶'}</Button>
    </div>
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
      <p className={`${styles.eyebrow} ${styles.secretTap}`} lang="ko" onClick={p.onSecretTap}>{p.label} ·{p.position} · 통과 {Math.min(p.passes, p.required)}/{p.required}</p>
      <ProgressBar value={o?.judgement.ratio ?? 0} label="맞힌 단어 비율" />
      <SentenceView p={p} final={final} />
      <ResultLine p={p} />
      {p.playMode ? <PlayControls p={p} /> : <>
        <MicButton listening={hf.running ? hf.step === 'listening' : listening}
          status={micStatus(p, o?.status ?? 'idle', o?.message ?? null)}
          disabled={p.micLocked && !listening}
          onClick={hf.running ? hf.onToggle : listening ? p.attempt.stop : p.onMic} />
        <HandsFreeControl hf={hf} />
      </>}
      <Extras p={p} listening={listening} />
      {p.playMode ? <PrevNext p={p} {...p.playMode} /> : <ClassicNext p={p} listening={listening} />}
    </div>
  );
}

function ClassicNext({ p, listening }: { p: Props; listening: boolean }) {
  return (
    <>
      <Button variant="primary" block disabled={!p.canNext || listening} onClick={p.onNext}>
        {p.isLast ? p.lastLabel : '다음 문장'}
      </Button>
      {/* 이미 통과했으면 "다음 문장"이 같은 일을 하고, 마지막 문장은 갈 곳이 없어 숨긴다 */}
      {!p.canNext && !p.isLast && (
        <Button variant="ghost" size="sm" block disabled={listening} onClick={p.onSkip}>건너뛰기 (통과 안 함)</Button>
      )}
    </>
  );
}
