import type { RolePlayLine } from '../../content/lessonTypes';
import styles from './OldDialogue.module.css';
import type { Turn } from './useRolePlaySession';

type Props = {
  line: RolePlayLine;
  index: number;
  total: number;
  partnerRole: string;
  turn: Turn; // 내 줄일 때 들린 말을 카드에 보여 준다
};

// 내 줄은 정해진 문장이 없어(내 말로 대답) 들린 말을 큰 글씨로. 아직 말하기 전이면 안내 문구
function heardText(turn: Turn): string | null {
  return turn.live?.heard || turn.last?.judgement.heard || null;
}

// 롤플레이 연습 중 한 줄씩 보여 주는 박스 (대화문 카드와 같은 모양, 사용자 요청 2026-11-19)
export function RolePlayCard({ line, index, total, partnerRole, turn }: Props) {
  const me = line.speaker === 'me';
  const heard = me ? heardText(turn) : null;
  return (
    <>
      <p className={styles.where} lang="ko">{index + 1} / {total}줄</p>
      {/* key가 바뀔 때마다 새 카드가 아래에서 올라오게 */}
      <article key={index} className={`${styles.card} ${me ? styles.cardMe : ''}`}>
        <span className={styles.who} lang="ko">{me ? '나' : partnerRole}</span>
        {line.speaker === 'partner' && <>
          <p className={styles.cardEn} lang="en">{line.en}</p>
          <p className={styles.cardKo} lang="ko">{line.ko}</p>
        </>}
        {me && (heard
          ? <p className={styles.cardEn} lang="en">{heard}</p>
          : <p className={styles.cardKo} lang="ko">내 차례예요. 영어로 대답해 보세요</p>)}
      </article>
    </>
  );
}
