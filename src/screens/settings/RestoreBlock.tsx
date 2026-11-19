import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { parseBackup, summarizeBackup, type BackupData } from '../../backup/backup';
import { restoreBackup } from '../../db/backup';
import styles from './Settings.module.css';

type Pending = { data: BackupData; dropped: number; exportedAt: string };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '날짜 모름' : d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

function Summary({ p }: { p: Pending }) {
  const s = summarizeBackup(p.data);
  return (
    <>
      <p className={styles.keyHint} lang="ko">백업한 때: {formatDate(p.exportedAt)}</p>
      <ul className={styles.summary} lang="ko">
        <li>저장 문장 {s.savedSentences}개 · 단어 {s.vocab}개</li>
        <li>진도 {s.progress}개 · 복습 기록 {s.srsState}개 · 연습 기록 {s.activity}일</li>
        <li>설정: 튜터 {p.data.settings.tutorName}, 일일 목표 {p.data.settings.dailyGoal}번 등</li>
      </ul>
      {p.dropped > 0 && <p className={styles.keyHint} lang="ko">읽을 수 없는 항목 {p.dropped}개는 빼고 가져와요.</p>}
      <p className={styles.warn} lang="ko">이 기기의 지금 기록은 모두 지워지고 백업 내용으로 바뀌어요. 되돌릴 수 없어요.</p>
    </>
  );
}

// 파일을 고르면 바로 바꾸지 않고, 무엇이 들어 있는지 보여 준 뒤 한 번 더 눌러야 바꾼다 (덮어쓰기라서)
export function RestoreBlock() {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    setPending(null);
    setMessage('');
    if (!file) return;
    try {
      const r = parseBackup(await file.text());
      if (r.ok) setPending(r);
      else setMessage(r.error);
    } catch {
      setMessage('파일을 읽지 못했어요.');
    }
  };

  const apply = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBackup(pending.data);
      setPending(null);
      setMessage('복원했어요. 앱을 다시 불러옵니다…');
      // 설정·화면이 새 값을 읽도록 다시 불러온다
      window.setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setMessage(`복원하지 못했어요. 이 기기의 기록은 그대로예요: ${String(e)}`);
      setBusy(false);
    }
  };

  return (
    <div className={styles.keyBlock}>
      <p className={styles.keyName} lang="ko">백업 불러오기</p>
      <p className={styles.keyHint} lang="ko">백업 파일(.json)을 골라 이 기기에 복원해요.</p>
      <input ref={input} className={styles.hidden} type="file" accept="application/json,.json" aria-label="백업 파일 선택"
        onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      {!pending && <div className={styles.keyActions}><Button size="sm" onClick={() => input.current?.click()}>백업 파일 고르기</Button></div>}
      {pending && (
        <>
          <Summary p={pending} />
          <div className={styles.keyActions}>
            <Button variant="primary" size="sm" disabled={busy} onClick={apply}>지우고 복원하기</Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setPending(null)}>취소</Button>
          </div>
        </>
      )}
      {message && <p className={styles.keyState} lang="ko" role="status">{message}</p>}
    </div>
  );
}
