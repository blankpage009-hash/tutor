import type { ReactNode } from 'react';
import type { DialogueLine } from '../../content/lessonTypes';
import { WordHighlight } from '../../components/WordHighlight';
import type { useShadowingAttempt } from '../shadowing/useShadowingAttempt';
import styles from './Dialogue.module.css';

type Outcome = ReturnType<typeof useShadowingAttempt>['outcome'];

type Props = {
  line: DialogueLine;
  index: number;
  total: number;
  partnerRole: string;
  outcome?: Outcome; // 내 차례일 때만: 말한 결과를 영어 문장 자리에 색칠해 보여 준다
  children?: ReactNode; // 내 차례일 때 마이크 패널
};

// Speak 연습 중 한 줄씩 보여 주는 박스 (드릴 카드처럼, 사용자 요청 2026-11-19)
export function DialogueCard({ line, index, total, partnerRole, outcome, children }: Props) {
  const me = line.speaker === 'me';
  const final = outcome?.status === 'passed' || outcome?.status === 'failed';
  return (
    <>
      <p className={styles.where} lang="ko">{index + 1} / {total}줄</p>
      {/* key가 바뀔 때마다 새 카드가 아래에서 올라오게 */}
      <article key={index} className={`${styles.card} ${me ? styles.cardMe : ''}`}>
        <span className={styles.who} lang="ko">{me ? '나' : partnerRole}</span>
        {outcome
          ? <WordHighlight words={outcome.judgement.words} nextIndex={outcome.judgement.nextIndex} final={final} />
          : <p className={styles.cardEn} lang="en">{line.en}</p>}
        <p className={styles.cardKo} lang="ko">{line.ko}</p>
      </article>
      {children}
    </>
  );
}
