import { IconCheck, IconClose } from './icons/icons';
import styles from './ResultMark.module.css';

// 말하기 판정 결과 옆에 톡 튀어나오는 ✓/✗ 동그라미 (사용자 요청 2026-11-19).
// 결과가 바뀔 때마다 새로 그려져서(듣는 중에는 결과 줄이 사라짐) 매번 다시 튀어나온다
export function ResultMark({ pass }: { pass: boolean }) {
  return (
    <span className={`${styles.mark} ${pass ? styles.pass : styles.fail}`} role="img" aria-label={pass ? '통과' : '실패'}>
      {pass ? <IconCheck /> : <IconClose />}
    </span>
  );
}
