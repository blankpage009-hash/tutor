import type { Dispatch } from 'react';
import { Button } from '../../components/Button';
import { MicButton } from '../../components/MicButton';
import { ProgressBar } from '../../components/ProgressBar';
import type { Sentence } from '../../content/types';
import { MAX_FAILS, maskText, type ReviewAction, type ReviewState } from '../../reviewPlan';
import { SLOW_RATE, type useNewSpeaking } from '../newLesson/useNewSpeaking';
import styles from './Review.module.css';

type Speaking = ReturnType<typeof useNewSpeaking>;
type Props = { sentence: Sentence; state: ReviewState; speaking: Speaking; dispatch: Dispatch<ReviewAction> };
type PartProps = { state: ReviewState; sp: Speaking; dispatch: Dispatch<ReviewAction> };

function micStatus(sp: Speaking, listening: boolean): string {
  const o = sp.attempt.outcome;
  if (listening) return '듣는 중… 다 말하면 저절로 멈춰요';
  if (o?.message) return o.message;
  if (sp.micLocked && sp.engineNote) return sp.engineNote;
  return '탭하고 영어로 말해 보세요';
}

// 말해 본 결과 한 줄 (열려 있는 카드에서 틀렸을 때, 또는 통과했을 때)
function ResultLine({ sp, state }: { sp: Speaking; state: ReviewState }) {
  const o = sp.attempt.outcome;
  if (!o || (o.status !== 'passed' && o.status !== 'failed')) return null;
  const pct = Math.round(o.judgement.ratio * 100);
  if (o.status === 'passed') return <p className={styles.line} lang="ko">통과! 일치율 {pct}%</p>;
  if (state.outcome !== 'open') return null;
  return (
    <p className={styles.line} lang="ko">
      조금만 더! 일치율 {pct}% · 남은 기회 {MAX_FAILS - state.fails}번
      {o.judgement.heard && <> · 들린 말: <span lang="en">“{o.judgement.heard}”</span></>}
    </p>
  );
}

function Prompt({ sentence, state }: { sentence: Sentence; state: ReviewState }) {
  if (state.outcome !== 'open') return <p className={styles.answer} lang="en">{sentence.en}</p>;
  if (state.hint === 0) return <p className={styles.hidden} lang="ko">영어로 말해 보세요</p>;
  return <p className={styles.mask} lang="en">{maskText(sentence.en, state.hint)}</p>;
}

function Open({ state, sp, dispatch }: PartProps) {
  const listening = sp.attempt.outcome?.status === 'listening';
  return (
    <>
      <MicButton listening={listening} disabled={sp.micLocked && !listening} status={micStatus(sp, listening)}
        onClick={listening ? sp.attempt.stop : sp.attempt.start} />
      <div className={styles.actions}>
        <Button size="sm" disabled={listening || state.hint >= 2} onClick={() => dispatch({ type: 'hint' })}>
          힌트 보기 ({state.hint}/2)
        </Button>
        <Button size="sm" variant="ghost" disabled={listening} onClick={() => dispatch({ type: 'giveUp' })}>정답 보기</Button>
      </div>
    </>
  );
}

function Done({ state, sp, dispatch }: PartProps) {
  const last = state.index === state.ids.length - 1;
  return (
    <>
      {state.outcome === 'gave-up' && <p className={styles.line} lang="ko">정답을 확인했어요. 내일 다시 나와요.</p>}
      <div className={styles.actions}>
        <Button size="sm" onClick={() => sp.attempt.playTutor(1)}>정답 듣기</Button>
        <Button size="sm" onClick={() => sp.attempt.playTutor(SLOW_RATE)}>느리게 듣기</Button>
      </div>
      <Button variant="primary" block onClick={() => dispatch({ type: 'next' })}>{last ? '결과 보기' : '다음 문장'}</Button>
    </>
  );
}

export function ReviewCard({ sentence, state, speaking, dispatch }: Props) {
  const total = state.ids.length;
  return (
    <div className={styles.stage}>
      <p className={styles.eyebrow} lang="ko">복습 · 문장 {state.index + 1} / {total}</p>
      <ProgressBar value={state.index / total} label="복습 진행" />
      <p className={styles.ko} lang="ko">{sentence.ko}</p>
      <Prompt sentence={sentence} state={state} />
      <ResultLine sp={speaking} state={state} />
      {state.outcome === 'open'
        ? <Open state={state} sp={speaking} dispatch={dispatch} />
        : <Done state={state} sp={speaking} dispatch={dispatch} />}
    </div>
  );
}
