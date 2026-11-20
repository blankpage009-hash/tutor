import styles from './RolePlay.module.css';

// SITUATION 점선 카드 (디자인 v2 07): 연습 중에도 맨 위에 두어 무슨 상황인지 잊지 않게
export function SituationCard({ text }: { text: string }) {
  return (
    <section className={styles.situation}>
      <span className={styles.label}>Situation</span>
      <p className={styles.situationText} lang="ko">{text}</p>
    </section>
  );
}
