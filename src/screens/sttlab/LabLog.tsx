import { useState } from 'react';
import { Button } from '../../components/Button';
import styles from './SttLab.module.css';

type Props = { logs: string[]; onCopy: () => Promise<string>; onClear: () => void };

// 시험 기록과 "기록 복사" 버튼
export function LabLog({ logs, onCopy, onClear }: Props) {
  const [copyMsg, setCopyMsg] = useState('');
  return (
    <section className={styles.section}>
      <div className={styles.buttons}>
        <Button size="sm" onClick={() => onCopy().then(setCopyMsg)}>기록 복사</Button>
        <Button size="sm" variant="ghost" onClick={onClear}>기록 지우기</Button>
      </div>
      <p className={styles.note} lang="ko">{copyMsg}</p>
      <ol className={styles.log}>
        {logs.map((l, i) => <li key={i}>{l}</li>)}
      </ol>
    </section>
  );
}
