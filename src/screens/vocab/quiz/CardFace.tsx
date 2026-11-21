import { IconRepeat } from '../../../components/icons/icons';
import type { VocabWord } from '../../../db/types';
import { posEnglish, posLabel } from '../../../posLabels';
import reviewStyles from '../../review/Review.module.css';
import styles from './Quiz.module.css';
import { useSwipeGrade } from './useSwipeGrade';
import { useWordAutoPlay } from './useWordAutoPlay';

type Props = {
  word: VocabWord;
  flipped: boolean;
  onFlip: () => void;
  onGrade: (grade: 'again' | 'good') => void;
};

// 카드 한 장: 탭하면 앞↔뒤, 오른쪽으로 밀면 Knew It(good), 왼쪽으로 밀면 Didn't Know(again).
// 단어마다 key로 새로 만들어져 밀린 위치·방향 상태가 다음 카드로 넘어가지 않는다.
export function CardFace({ word, flipped, onFlip, onGrade }: Props) {
  useWordAutoPlay(word.word);
  const swipe = useSwipeGrade((dir) => onGrade(dir === 'right' ? 'good' : 'again'));
  const tint = swipe.dx > 20 ? styles.tintGood : swipe.dx < -20 ? styles.tintAgain : '';
  const onClick = () => {
    if (swipe.consumeMoved()) return;
    onFlip();
  };
  return (
    <button type="button" {...swipe.handlers} onClick={onClick}
      className={`${reviewStyles.card} ${styles.flipCard} ${tint}`}
      style={{ transform: `translateX(${swipe.dx}px) rotate(${swipe.dx / 25}deg)`, transition: swipe.dragging ? 'none' : undefined }}
      aria-label={flipped ? `${word.meaning}, 눌러서 영어 단어 보기` : `${word.word}, 눌러서 뜻 보기`}>
      <span className={styles.cardTop}><span className={reviewStyles.labelMuted} lang="en">{flipped ? 'MEANING' : 'WORD'}</span></span>
      {flipped ? <Back word={word} /> : (
        <span key="front" className={styles.face}>
          <span className={styles.bigWord} lang="en">{word.word}</span>
          <span className={styles.posLong} lang="en">{posEnglish(word.pos)}</span>
        </span>
      )}
      <span className={styles.flipHint}><IconRepeat /><span className={reviewStyles.labelMuted} lang="en">TAP TO FLIP</span></span>
    </button>
  );
}

function Back({ word }: { word: VocabWord }) {
  return (
    <span key="back" className={`${styles.face} ${styles.back}`}>
      <span className={styles.meaning} lang="ko">{word.meaning}</span>
      <span className={styles.posLong} lang="ko">{posLabel(word.pos)} · <span lang="en">{word.word}</span></span>
      {word.sourceEn && (
        <span className={styles.source}>
          <span lang="en">{word.sourceEn}</span>
          {word.sourceKo && <span className={styles.sourceKo} lang="ko">{word.sourceKo}</span>}
        </span>
      )}
    </span>
  );
}
