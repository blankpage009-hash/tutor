import { useState, type Dispatch, type FormEvent, type ReactNode } from 'react';
import { Button } from '../../../components/Button';
import { IconBulb, IconEye } from '../../../components/icons/icons';
import { MicButton } from '../../../components/MicButton';
import { RunTopBar } from '../../../components/RunTopBar';
import type { VocabWord } from '../../../db/types';
import { posLabel } from '../../../posLabels';
import { MAX_FAILS, maskText, type ReviewAction, type ReviewState } from '../../../reviewPlan';
import { blankInSentence } from '../../../vocabQuiz';
import type { useNewSpeaking } from '../../newLesson/useNewSpeaking';
import { HintWords } from '../../review/HintWords';
import reviewStyles from '../../review/Review.module.css';
import styles from './Quiz.module.css';
import type { TypeKind } from './useTypeQuizRun';

type Speaking = ReturnType<typeof useNewSpeaking>;
type Props = {
  word: VocabWord; kind: TypeKind; tabs: ReactNode; state: ReviewState; speaking: Speaking;
  dispatch: Dispatch<ReviewAction>; onSubmit: (text: string) => void;
};

function micLabel(sp: Speaking, listening: boolean, kind: TypeKind): string {
  if (listening) return 'Listening…';
  if (sp.attempt.outcome?.status === 'failed') return 'Try again';
  return kind === 'write' ? 'Say the word' : 'Say the sentence';
}

function micTip(sp: Speaking, listening: boolean): string | null {
  if (listening) return '다 말하면 저절로 멈춰요';
  const o = sp.attempt.outcome;
  if (o?.message) return o.message;
  if (sp.micLocked && sp.engineNote) return sp.engineNote;
  return null;
}

// 문제 부분. Meaning(뜻→영어): 한국어 뜻 → (힌트) 빈칸 글자 수·첫 글자. Blank(문장 빈칸): 단어가 빈칸인 문장 → (힌트) 뜻 → 첫 글자
function Question({ word, kind, state }: { word: VocabWord; kind: TypeKind; state: ReviewState }) {
  const done = state.outcome !== 'open';
  if (kind === 'write') {
    return (
      <>
        <p className={reviewStyles.ko} lang="ko">{word.meaning} <span className={styles.posInline}>{posLabel(word.pos)}</span></p>
        {done && <p className={reviewStyles.answer} lang="en">{word.word}</p>}
        {!done && state.hint === 0 && <p className={reviewStyles.hidden} lang="ko">영어 단어를 쓰거나 말해 보세요</p>}
        {!done && state.hint > 0 && <HintWords text={maskText(word.word, state.hint)} sameWidth={false} />}
      </>
    );
  }
  const en = word.sourceEn ?? '';
  return (
    <>
      <p className={styles.koSmall} lang="ko">{word.sourceKo}</p>
      {done
        ? <p className={reviewStyles.answer} lang="en">{en}</p>
        : <p className={styles.mask} lang="en">{blankInSentence(en, word.word, state.hint === 2 ? 2 : 0)}</p>}
      {!done && state.hint >= 1 && <p className={reviewStyles.heard} lang="ko">뜻: {word.meaning} ({posLabel(word.pos)})</p>}
      {!done && state.hint === 0 && <p className={reviewStyles.hidden} lang="ko">빈칸의 단어를 쓰거나, 문장 전체를 말해 보세요</p>}
      {done && <p className={reviewStyles.heard} lang="ko"><span lang="en">{word.word}</span> = {word.meaning}</p>}
    </>
  );
}

function ResultLine({ sp, state, kind, typed }: { sp: Speaking; state: ReviewState; kind: TypeKind; typed: string }) {
  if (state.outcome === 'passed') return <p className={`${reviewStyles.result} ${reviewStyles.pass}`} lang="en">Correct</p>;
  if (state.outcome === 'gave-up' || state.fails === 0) return null;
  const o = sp.attempt.outcome;
  const heard = o?.status === 'failed' ? o.judgement.heard : '';
  return (
    <div className={reviewStyles.resultBox}>
      <p className={`${reviewStyles.result} ${reviewStyles.fail}`} lang="en">Try again</p>
      <p className={reviewStyles.heard} lang="ko">
        {kind === 'cloze' && o?.status === 'failed' ? '빈칸의 단어가 안 들렸어요 · ' : ''}남은 기회 {MAX_FAILS - state.fails}번
        {heard && <> · 들린 말 <span lang="en">“{heard}”</span></>}
        {!heard && typed && <> · 쓴 답 <span lang="en">“{typed}”</span></>}
      </p>
    </div>
  );
}

function AnswerForm({ disabled, onSubmit, onTyped }: { disabled: boolean; onSubmit: (t: string) => void; onTyped: (t: string) => void }) {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onTyped(text.trim());
    onSubmit(text);
    setText('');
  };
  return (
    <form className={styles.typeRow} onSubmit={submit}>
      <input className={styles.input} lang="en" value={text} onChange={(e) => setText(e.target.value)} disabled={disabled}
        aria-label="영어 답" placeholder="Type in English" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <Button type="submit" disabled={disabled || !text.trim()}>Check</Button>
    </form>
  );
}

function OpenControls({ state, speaking, dispatch, kind, onSubmit, onTyped }: Omit<Props, 'word' | 'tabs'> & { onTyped: (t: string) => void }) {
  const listening = speaking.attempt.outcome?.status === 'listening';
  const tip = micTip(speaking, listening);
  return (
    <>
      <AnswerForm disabled={listening} onSubmit={onSubmit} onTyped={onTyped} />
      <div className={reviewStyles.pair}>
        <Button disabled={listening || state.hint >= state.maxHint} onClick={() => dispatch({ type: 'hint' })}><IconBulb />Hint</Button>
        <Button disabled={listening} onClick={() => dispatch({ type: 'giveUp' })}><IconEye />Show Answer</Button>
      </div>
      <div className={reviewStyles.micArea}>
        <MicButton tone="label" listening={listening} disabled={speaking.micLocked && !listening} status={micLabel(speaking, listening, kind)}
          onClick={listening ? speaking.attempt.stop : speaking.attempt.start} />
        {tip && <p className={reviewStyles.tip} lang="ko">{tip}</p>}
      </div>
    </>
  );
}

// Meaning · Blank 한 문제: 위 X·막대·탭 → 카드 → 쓰기 칸 · Hint · Show Answer · 마이크 (복습 카드와 같은 모양)
export function TypeQuizCard({ word, kind, tabs, state, speaking, dispatch, onSubmit }: Props) {
  const total = state.ids.length;
  const [typed, setTyped] = useState('');
  const last = state.index === total - 1;
  const top = kind === 'write' ? 'MEANING → EN' : 'BLANK';
  return (
    <div className={reviewStyles.stage}>
      <RunTopBar closeTo="/vocab" closeLabel="퀴즈 닫고 단어장으로" value={(state.index + 1) / total} count={`${state.index + 1}/${total}`} />
      {tabs}
      <section className={reviewStyles.card} aria-label="퀴즈 카드">
        <div className={reviewStyles.cardTop}>
          <span className={reviewStyles.labelAccent} lang="en">{top}</span>
          <span className={reviewStyles.labelMuted} lang="en">{state.outcome === 'open' ? `HINT ${state.hint} / ${state.maxHint}` : 'ANSWER'}</span>
        </div>
        <div className={reviewStyles.cardBody}>
          <Question word={word} kind={kind} state={state} />
          <ResultLine sp={speaking} state={state} kind={kind} typed={typed} />
          {state.outcome === 'gave-up' && <p className={reviewStyles.heard} lang="ko">정답을 확인했어요. 내일 다시 나와요.</p>}
        </div>
      </section>
      {state.outcome === 'open'
        ? <OpenControls state={state} speaking={speaking} dispatch={dispatch} kind={kind} onSubmit={onSubmit} onTyped={setTyped} />
        : <Button variant="primary" block onClick={() => { setTyped(''); dispatch({ type: 'next' }); }}>{last ? 'See Results' : 'Next'}</Button>}
    </div>
  );
}
