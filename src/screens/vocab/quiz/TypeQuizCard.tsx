import { useState, type Dispatch, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { MicButton } from '../../../components/MicButton';
import { ProgressBar } from '../../../components/ProgressBar';
import type { VocabWord } from '../../../db/types';
import { posLabel } from '../../../posLabels';
import { MAX_FAILS, maskText, type ReviewAction, type ReviewState } from '../../../reviewPlan';
import { blankInSentence } from '../../../vocabQuiz';
import type { useNewSpeaking } from '../../newLesson/useNewSpeaking';
import reviewStyles from '../../review/Review.module.css';
import styles from './Quiz.module.css';
import type { TypeKind } from './useTypeQuizRun';

type Speaking = ReturnType<typeof useNewSpeaking>;
type Props = {
  word: VocabWord; kind: TypeKind; state: ReviewState; speaking: Speaking;
  dispatch: Dispatch<ReviewAction>; onSubmit: (text: string) => void;
};

function micStatus(sp: Speaking, listening: boolean, kind: TypeKind): string {
  const o = sp.attempt.outcome;
  if (listening) return '듣는 중… 다 말하면 저절로 멈춰요';
  if (o?.message) return o.message;
  if (sp.micLocked && sp.engineNote) return sp.engineNote;
  return kind === 'write' ? '탭하고 영어 단어를 말해 보세요' : '탭하고 문장 전체를 말해 보세요';
}

// 문제 부분. 뜻→영어: 한국어 뜻 → (힌트) 빈칸 글자 수·첫 글자. 문장 빈칸: 단어가 빈칸인 문장 → (힌트) 뜻 → 첫 글자
function Question({ word, kind, state }: { word: VocabWord; kind: TypeKind; state: ReviewState }) {
  const done = state.outcome !== 'open';
  if (kind === 'write') {
    return (
      <>
        <p className={reviewStyles.ko} lang="ko">{word.meaning} <span className={styles.pos}>{posLabel(word.pos)}</span></p>
        {done && <p className={reviewStyles.answer} lang="en">{word.word}</p>}
        {!done && state.hint === 0 && <p className={reviewStyles.hidden} lang="ko">영어 단어를 쓰거나 말해 보세요</p>}
        {!done && state.hint > 0 && <p className={reviewStyles.mask} lang="en">{maskText(word.word, state.hint)}</p>}
      </>
    );
  }
  const en = word.sourceEn ?? '';
  return (
    <>
      <p className={reviewStyles.ko} lang="ko">{word.sourceKo}</p>
      {done
        ? <p className={reviewStyles.answer} lang="en">{en}</p>
        : <p className={reviewStyles.mask} lang="en">{blankInSentence(en, word.word, state.hint === 2 ? 2 : 0)}</p>}
      {!done && state.hint >= 1 && <p className={reviewStyles.line} lang="ko">뜻: {word.meaning} ({posLabel(word.pos)})</p>}
      {!done && state.hint === 0 && <p className={reviewStyles.hidden} lang="ko">빈칸의 단어를 쓰거나, 문장 전체를 말해 보세요</p>}
    </>
  );
}

function ResultLine({ sp, state, kind, typed }: { sp: Speaking; state: ReviewState; kind: TypeKind; typed: string }) {
  const o = sp.attempt.outcome;
  if (state.outcome === 'passed') return <p className={reviewStyles.line} lang="ko">정답이에요!</p>;
  if (state.outcome === 'gave-up' || state.fails === 0) return null;
  const heard = o?.status === 'failed' ? o.judgement.heard : '';
  return (
    <p className={reviewStyles.line} lang="ko">
      {kind === 'cloze' && o?.status === 'failed' ? '빈칸의 단어가 안 들렸어요' : '아쉬워요'} · 남은 기회 {MAX_FAILS - state.fails}번
      {heard && <> · 들린 말: <span lang="en">“{heard}”</span></>}
      {!heard && typed && <> · 쓴 답: <span lang="en">“{typed}”</span></>}
    </p>
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
        aria-label="영어 답" placeholder="영어로 쓰기" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <Button type="submit" disabled={disabled || !text.trim()}>확인</Button>
    </form>
  );
}

export function TypeQuizCard({ word, kind, state, speaking, dispatch, onSubmit }: Props) {
  const total = state.ids.length;
  const [typed, setTyped] = useState('');
  const open = state.outcome === 'open';
  const listening = speaking.attempt.outcome?.status === 'listening';
  const last = state.index === total - 1;
  return (
    <div className={reviewStyles.stage}>
      <p className={reviewStyles.eyebrow} lang="ko">{kind === 'write' ? '뜻 → 영어' : '문장 빈칸'} · 단어 {state.index + 1} / {total}</p>
      <ProgressBar value={state.index / total} label="퀴즈 진행" />
      <Question word={word} kind={kind} state={state} />
      {kind === 'cloze' && !open && word.sourceKo && <p className={styles.source} lang="ko">{word.word} = {word.meaning}</p>}
      <ResultLine sp={speaking} state={state} kind={kind} typed={typed} />
      {open && (
        <>
          <MicButton listening={listening} disabled={speaking.micLocked && !listening} status={micStatus(speaking, listening, kind)}
            onClick={listening ? speaking.attempt.stop : speaking.attempt.start} />
          <AnswerForm disabled={listening} onSubmit={onSubmit} onTyped={setTyped} />
          <div className={reviewStyles.actions}>
            <Button size="sm" disabled={listening || state.hint >= 2} onClick={() => dispatch({ type: 'hint' })}>힌트 보기 ({state.hint}/2)</Button>
            <Button size="sm" variant="ghost" disabled={listening} onClick={() => dispatch({ type: 'giveUp' })}>정답 보기</Button>
          </div>
        </>
      )}
      {!open && (
        <>
          {state.outcome === 'gave-up' && <p className={reviewStyles.line} lang="ko">정답을 확인했어요. 내일 다시 나와요.</p>}
          <Button variant="primary" block onClick={() => { setTyped(''); dispatch({ type: 'next' }); }}>{last ? '결과 보기' : '다음 단어'}</Button>
        </>
      )}
    </div>
  );
}
