import { useState } from 'react';
import { Button } from '../../components/Button';
import { resetAllData } from '../../db/backup';
import styles from './Settings.module.css';

// 되돌릴 수 없는 일이라 버튼을 눌러도 바로 지우지 않고, 무엇이 지워지는지 적은 두 번째 확인을 거친다
export function ResetBlock() {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const reset = async () => {
    setBusy(true);
    try {
      await resetAllData();
      setMessage('모두 지웠어요. 앱을 다시 불러옵니다…');
      window.setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setMessage(`지우지 못했어요: ${String(e)}`);
      setBusy(false);
      setAsking(false);
    }
  };

  return (
    <div className={styles.keyBlock}>
      <p className={styles.keyName} lang="ko">전체 초기화</p>
      <p className={styles.keyHint} lang="ko">이 기기의 모든 기록과 설정을 지우고 처음 상태로 돌려요.</p>
      {!asking && <div className={styles.keyActions}><Button size="sm" onClick={() => setAsking(true)}>전체 초기화…</Button></div>}
      {asking && (
        <>
          <p className={styles.warn} lang="ko">
            저장 문장·단어장·진도·복습 기록·연습 기록·설정·Gemini 키·테마가 모두 지워져요. 되돌릴 수 없으니, 먼저 위에서 백업을 저장해 두는 걸 권해요.
          </p>
          <div className={styles.keyActions}>
            <Button variant="primary" size="sm" disabled={busy} onClick={reset}>모두 지우기</Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setAsking(false)}>취소</Button>
          </div>
        </>
      )}
      {message && <p className={styles.keyState} lang="ko" role="status">{message}</p>}
    </div>
  );
}
