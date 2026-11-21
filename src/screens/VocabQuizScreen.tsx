import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { RunTopBar } from '../components/RunTopBar';
import { SegmentedControl } from '../components/SegmentedControl';
import { isQuizKind, type QuizKind, type QuizScope } from '../vocabQuiz';
import reviewStyles from './review/Review.module.css';
import { CardQuiz } from './vocab/quiz/CardQuiz';
import { TypeQuiz } from './vocab/quiz/TypeQuiz';
import { useQuizWords } from './vocab/quiz/useQuizWords';

// 탭 이름은 디자인대로 영문. '뜻 → 영어'(write)는 이름만 Meaning (PLAN 7.95 기본값, 동작 같음)
const KINDS: { value: QuizKind; label: string }[] = [
  { value: 'card', label: 'Card' }, { value: 'write', label: 'Meaning' }, { value: 'cloze', label: 'Blank' }
];

type RunProps = { kind: QuizKind; scope: QuizScope; setScope: (s: QuizScope) => void; tabs: ReactNode };

function Empty({ kind, scope, setScope, tabs }: RunProps) {
  return (
    <div className={reviewStyles.stack}>
      <RunTopBar closeTo="/vocab" closeLabel="퀴즈 닫고 단어장으로" />
      {tabs}
      <p className={reviewStyles.note} lang="ko">
        {scope === 'due' ? '오늘 복습할 단어가 없어요. 저장한 단어는 저장한 다음 날부터 복습에 나와요.'
          : kind === 'cloze' ? '문장 빈칸으로 풀 수 있는 단어가 없어요. 문장 속 단어를 눌러 저장하면 생겨요.' : '풀 수 있는 저장 단어가 없어요.'}
      </p>
      {scope === 'due' && <Button variant="primary" block onClick={() => setScope('random')}>Random</Button>}
    </div>
  );
}

function Run(p: RunProps) {
  const [round, setRound] = useState(0);
  const { words, error } = useQuizWords(p.kind, p.scope, round);
  const onContinue = () => setRound((r) => r + 1);
  if (!words || words.length === 0) {
    if (words) return <Empty {...p} />;
    return (
      <div className={reviewStyles.stack}>
        <RunTopBar closeTo="/vocab" closeLabel="퀴즈 닫고 단어장으로" />
        {p.tabs}
        <p className={reviewStyles.note} lang="ko">{error ?? '불러오는 중…'}</p>
      </div>
    );
  }
  if (p.kind === 'card') return <CardQuiz key={round} words={words} tabs={p.tabs} onContinue={onContinue} />;
  return <TypeQuiz key={round} words={words} kind={p.kind} tabs={p.tabs} onContinue={onContinue} />;
}

// 디자인 v2 11 VOCAB QUIZ: 위 X·막대 → Card · Meaning · Blank 탭 → 카드. 탭을 바꾸면 그 종류로 새 판을 시작한다.
// /vocab/quiz?mode=card|write|cloze&scope=due|random (mode가 없으면 Card)
export function VocabQuizScreen() {
  const [params, setParams] = useSearchParams();
  const modeParam = params.get('mode');
  const kind: QuizKind = isQuizKind(modeParam) ? modeParam : 'card';
  const scope: QuizScope = params.get('scope') === 'random' ? 'random' : 'due';
  const update = (m: QuizKind, s: QuizScope) => setParams({ mode: m, scope: s }, { replace: true });
  const tabs = <SegmentedControl tall label="퀴즈 종류" options={KINDS} value={kind} onChange={(k) => update(k, scope)} />;
  return <Run key={`${kind}-${scope}`} kind={kind} scope={scope} setScope={(s) => update(kind, s)} tabs={tabs} />;
}
