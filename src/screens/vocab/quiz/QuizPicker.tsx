import { SegmentedControl } from '../../../components/SegmentedControl';
import type { QuizKind, QuizScope } from '../../../vocabQuiz';
import reviewStyles from '../../review/Review.module.css';
import { useDueWordCount } from '../useVocab';
import styles from './Quiz.module.css';

export const KIND_TEXT: Record<QuizKind, { name: string; desc: string }> = {
  card: { name: '카드 뒤집기', desc: '영어 단어를 보고 뜻을 떠올린 뒤, 뒤집어 확인하고 스스로 등급을 매겨요' },
  write: { name: '뜻 → 영어', desc: '한국어 뜻을 보고 영어 단어를 쓰거나 말해요' },
  cloze: { name: '문장 빈칸', desc: '저장할 때의 문장에서 단어를 가리고, 빈칸의 단어를 쓰거나 문장 전체를 말해요' }
};

const SCOPES: { value: QuizScope; label: string }[] = [
  { value: 'due', label: '오늘 복습' }, { value: 'random', label: '랜덤' }
];

type Props = { scope: QuizScope; onScope: (s: QuizScope) => void; onPick: (k: QuizKind) => void };

// 퀴즈 종류 고르기 + 범위(오늘 때가 된 단어 / 저장한 전체에서 랜덤)
export function QuizPicker({ scope, onScope, onPick }: Props) {
  const due = useDueWordCount();
  return (
    <>
      <p className={reviewStyles.note} lang="ko">
        {due === null ? '세는 중…' : due > 0 ? `오늘 복습할 단어가 ${due}개 있어요.` : '오늘 복습할 단어는 없어요. 랜덤으로 연습할 수 있어요.'}
      </p>
      <SegmentedControl label="범위" options={SCOPES} value={scope} onChange={onScope} />
      <div className={styles.choices}>
        {(Object.keys(KIND_TEXT) as QuizKind[]).map((k) => (
          <button key={k} type="button" className={styles.choice} onClick={() => onPick(k)}>
            <span className={styles.choiceName} lang="ko">{KIND_TEXT[k].name}</span>
            <span className={styles.choiceDesc} lang="ko">{KIND_TEXT[k].desc}</span>
          </button>
        ))}
      </div>
    </>
  );
}
