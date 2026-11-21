import styles from './RolePlay.module.css';

// SITUATION 점선 카드 (디자인 v2 07): 연습 중에도 맨 위에 두어 무슨 상황인지 잊지 않게
// big = 시작 화면용: 두 배 높이 + 실선, note = 구분선 아래 진행 안내 (사용자 요청 2026-11-21).
// 연습 중 카드는 작은 점선 그대로
type Props = { text: string; big?: boolean; note?: string };

export function SituationCard({ text, big = false, note }: Props) {
  return (
    <section className={big ? `${styles.situation} ${styles.situationBig}` : styles.situation}>
      <span className={styles.label}>Situation</span>
      <p className={styles.situationText} lang="ko">{text}</p>
      {note && <p className={styles.introNote} lang="ko">{note}</p>}
    </section>
  );
}
