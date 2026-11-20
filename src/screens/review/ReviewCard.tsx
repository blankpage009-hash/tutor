import type { Dispatch } from 'react';
import { Button } from '../../components/Button';
import { IconBulb, IconEye, IconPlay, IconReplay } from '../../components/icons/icons';
import { MicButton } from '../../components/MicButton';
import { RunTopBar } from '../../components/RunTopBar';
import type { Sentence } from '../../content/types';
import { MAX_FAILS, reviewHintText, type ReviewAction, type ReviewState } from '../../reviewPlan';
import { SLOW_RATE, type useNewSpeaking } from '../newLesson/useNewSpeaking';
import { HintWords } from './HintWords';
import styles from './Review.module.css';

type Speaking = ReturnType<typeof useNewSpeaking>;
type Props = { sentence: Sentence; state: ReviewState; speaking: Speaking; dispatch: Dispatch<ReviewAction> };
type PartProps = { state: ReviewState; sp: Speaking; dispatch: Dispatch<ReviewAction> };

// 마이크 아래 영문 라벨 (버튼·라벨 글자는 디자인대로 영문 — PLAN 7.95 기본값)
function micLabel(sp: Speaking, listening: boolean): string {
  if (listening) return 'Listening…';
  if (sp.attempt.outcome?.status === 'failed') return 'Try again';
  return 'Say it in English';
}

// 라벨 밑 한국어 안내는 꼭 읽어야 할 말만 (듣는 중 요령, 오류·인식 준비)
function micTip(sp: Speaking, listening: boolean): string | null {
  if (listening) return '다 말하면 저절로 멈춰요';
  const o = sp.attempt.outcome;
  if (o?.message) return o.message;
  if (sp.micLocked && sp.engineNote) return sp.engineNote;
  return null;
}

// 말해 본 결과 한 줄: PASS · 96% / TRY AGAIN · 62% + 들린 말
function ResultLine({ sp, state }: { sp: Speaking; state: ReviewState }) {
  const o = sp.attempt.outcome;
  if (!o || (o.status !== 'passed' && o.status !== 'failed')) return null;
  const pct = Math.round(o.judgement.ratio * 100);
  if (o.status === 'passed') return <p className={`${styles.result} ${styles.pass}`} lang="en">Pass · {pct}%</p>;
  if (state.outcome !== 'open') return null;
  return (
    <div className={styles.resultBox}>
      <p className={`${styles.result} ${styles.fail}`} lang="en">Try again · {pct}%</p>
      <p className={styles.heard} lang="ko">
        남은 기회 {MAX_FAILS - state.fails}번
        {o.judgement.heard && <> · 들린 말 <span lang="en">“{o.judgement.heard}”</span></>}
      </p>
    </div>
  );
}

function Prompt({ sentence, state }: { sentence: Sentence; state: ReviewState }) {
  if (state.outcome !== 'open') return <p className={styles.answer} lang="en">{sentence.en}</p>;
  if (state.hint === 0) return <p className={styles.hidden} lang="ko">영어로 말해 보세요</p>;
  return <HintWords text={reviewHintText(sentence.en, state.hint)} sameWidth={state.hint === 1} />;
}

function Open({ state, sp, dispatch }: PartProps) {
  const listening = sp.attempt.outcome?.status === 'listening';
  const tip = micTip(sp, listening);
  return (
    <>
      <div className={styles.pair}>
        <Button disabled={listening || state.hint >= state.maxHint} onClick={() => dispatch({ type: 'hint' })}><IconBulb />Hint</Button>
        <Button disabled={listening} onClick={() => dispatch({ type: 'giveUp' })}><IconEye />Show Answer</Button>
      </div>
      <div className={styles.micArea}>
        <MicButton tone="label" listening={listening} disabled={sp.micLocked && !listening} status={micLabel(sp, listening)}
          onClick={listening ? sp.attempt.stop : sp.attempt.start} />
        {tip && <p className={styles.tip} lang="ko">{tip}</p>}
      </div>
    </>
  );
}

function Done({ state, sp, dispatch }: PartProps) {
  const last = state.index === state.ids.length - 1;
  return (
    <>
      <div className={styles.pair}>
        <Button onClick={() => sp.attempt.playTutor(1)}><IconPlay />Listen</Button>
        <Button onClick={() => sp.attempt.playTutor(SLOW_RATE)}><IconReplay />Slow</Button>
      </div>
      <Button variant="primary" block onClick={() => dispatch({ type: 'next' })}>{last ? 'See Results' : 'Next'}</Button>
    </>
  );
}

// 디자인 v2 08 REVIEW: 위 X·막대·3/8, 카드(KO → EN · HINT n / 3 · 한국어 · 힌트 칸), Hint·Show Answer, 마이크
export function ReviewCard({ sentence, state, speaking, dispatch }: Props) {
  const total = state.ids.length;
  return (
    <div className={styles.stage}>
      <RunTopBar closeTo="/" closeLabel="복습 닫고 홈으로" value={(state.index + 1) / total} count={`${state.index + 1}/${total}`} />
      <section className={styles.card} aria-label="복습 카드">
        <div className={styles.cardTop}>
          <span className={styles.labelAccent} lang="en">KO → EN</span>
          <span className={styles.labelMuted} lang="en">
            {state.outcome === 'open' ? `HINT ${state.hint} / ${state.maxHint}` : state.outcome === 'passed' ? 'PASSED' : 'ANSWER'}
          </span>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.ko} lang="ko">{sentence.ko}</p>
          <Prompt sentence={sentence} state={state} />
          <ResultLine sp={speaking} state={state} />
          {state.outcome === 'gave-up' && <p className={styles.heard} lang="ko">정답을 확인했어요. 내일 다시 나와요.</p>}
        </div>
      </section>
      {state.outcome === 'open'
        ? <Open state={state} sp={speaking} dispatch={dispatch} />
        : <Done state={state} sp={speaking} dispatch={dispatch} />}
    </div>
  );
}
