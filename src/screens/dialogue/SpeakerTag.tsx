import styles from './Dialogue.module.css';

// 줄 위의 작은 이름표: 상대 = 테두리만, 나 = 파랑 채움 "ME" (디자인 v2 05)
export function SpeakerTag({ me, partnerRole }: { me: boolean; partnerRole: string }) {
  return me
    ? <span className={`${styles.tag} ${styles.tagMe}`} lang="en">ME</span>
    : <span className={styles.tag} lang="ko">{partnerRole}</span>;
}
