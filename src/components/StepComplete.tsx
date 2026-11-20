import { useEffect, useRef } from 'react';
import { playFeedback } from '../speech/feedbackSound';
import { IconCheck } from './icons/icons';
import styles from './StepComplete.module.css';

type Props = { title: string; onClose: () => void };

// 단계를 끝냈을 때 한 번 덮어 보여 주는 축하 화면 (사용자 요청 2026-11-19). 탭하면 닫히고 원래 마무리 화면이 보인다.
// 부르는 쪽은 마이크를 다 반납한 뒤에 띄운다 (켜진 채 소리를 틀면 iOS 통화 모드 잡음)
export function StepComplete({ title, onClose }: Props) {
  // 개발 모드(StrictMode)는 효과를 두 번 돌려서, 소리가 겹쳐 나지 않게 한 번만
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    void playFeedback('complete');
  }, []);
  return (
    <button type="button" className={styles.overlay} onClick={onClose} aria-label={`${title} 닫기`}>
      <span className={styles.check}><IconCheck /></span>
      <span className={styles.title} lang="en">{title}</span>
      <span className={styles.hint} lang="ko">화면을 탭하면 계속해요</span>
    </button>
  );
}
