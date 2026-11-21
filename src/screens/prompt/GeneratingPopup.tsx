import styles from './GeneratingPopup.module.css';

// 상황 생성은 몇 초 걸려서, 그동안 화면이 멈춘 게 아니라 만드는 중임을 알려 주는 팝업
export function GeneratingPopup() {
  return (
    <div className={styles.backdrop} role="status" aria-live="polite">
      <div className={styles.box}>
        <span className={styles.spinner} aria-hidden="true" />
        <p className={styles.text}>Prompt Situation Generating...</p>
      </div>
    </div>
  );
}
