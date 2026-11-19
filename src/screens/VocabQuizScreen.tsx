import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { isQuizKind, type QuizKind, type QuizScope } from '../vocabQuiz';
import reviewStyles from './review/Review.module.css';
import { CardQuiz } from './vocab/quiz/CardQuiz';
import { KIND_TEXT, QuizPicker } from './vocab/quiz/QuizPicker';
import { TypeQuiz } from './vocab/quiz/TypeQuiz';
import { useQuizWords } from './vocab/quiz/useQuizWords';

function Empty({ kind, scope, onRandom }: { kind: QuizKind; scope: QuizScope; onRandom: () => void }) {
  const nav = useNavigate();
  return (
    <>
      <p className={reviewStyles.note} lang="ko">
        {scope === 'due' ? '오늘 복습할 단어가 없어요. 저장한 단어는 저장한 다음 날부터 복습에 나와요.'
          : kind === 'cloze' ? '문장 빈칸으로 풀 수 있는 단어가 없어요. 문장 속 단어를 눌러 저장하면 생겨요.' : '풀 수 있는 저장 단어가 없어요.'}
      </p>
      <div className={reviewStyles.actions}>
        {scope === 'due' && <Button onClick={onRandom}>랜덤으로 풀기</Button>}
        <Button variant="ghost" onClick={() => nav('/vocab')}>단어장으로</Button>
      </div>
    </>
  );
}

function Run({ kind, scope, setScope }: { kind: QuizKind; scope: QuizScope; setScope: (s: QuizScope) => void }) {
  const [round, setRound] = useState(0);
  const { words, error } = useQuizWords(kind, scope, round);
  const onContinue = () => setRound((r) => r + 1);
  return (
    <>
      {error && <p className={reviewStyles.note} lang="ko">{error}</p>}
      {!words && !error && <p className={reviewStyles.note} lang="ko">불러오는 중…</p>}
      {words?.length === 0 && <Empty kind={kind} scope={scope} onRandom={() => setScope('random')} />}
      {words && words.length > 0 && kind === 'card' && <CardQuiz key={`${scope}-${round}`} words={words} onContinue={onContinue} />}
      {words && words.length > 0 && kind !== 'card' && <TypeQuiz key={`${kind}-${scope}-${round}`} words={words} kind={kind} onContinue={onContinue} />}
    </>
  );
}

// /vocab/quiz = 종류·범위 고르기, /vocab/quiz?mode=card|write|cloze&scope=due|random = 한 판
export function VocabQuizScreen() {
  const [params, setParams] = useSearchParams();
  const modeParam = params.get('mode');
  const kind = isQuizKind(modeParam) ? modeParam : null;
  const scope: QuizScope = params.get('scope') === 'random' ? 'random' : 'due';
  const update = (next: { mode?: QuizKind | null; scope?: QuizScope }) => {
    const m = next.mode === undefined ? kind : next.mode;
    const s = next.scope ?? scope;
    setParams(m ? { mode: m, scope: s } : { scope: s }, { replace: true });
  };
  return (
    <>
      <ScreenHeader eyebrow="단어 퀴즈" title={kind ? KIND_TEXT[kind].name : '단어 퀴즈'} />
      {!kind
        ? <QuizPicker scope={scope} onScope={(s) => update({ scope: s })} onPick={(k) => update({ mode: k })} />
        : <Run kind={kind} scope={scope} setScope={(s) => update({ scope: s })} />}
    </>
  );
}
