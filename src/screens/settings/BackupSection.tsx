import { useState } from 'react';
import { SettingsRow } from '../../components/SettingsRow';
import { backupFileName, buildBackup } from '../../backup/backup';
import { collectBackupData } from '../../db/backup';
import { saveTextFile } from '../library/saveFile';
import { RestoreBlock } from './RestoreBlock';
import { ResetBlock } from './ResetBlock';
import styles from './Settings.module.css';

const SAVE_MESSAGE = { shared: '백업 파일을 내보냈어요. Gemini 키와 녹음은 들어가지 않아요.', downloaded: '백업 파일을 내려받았어요. Gemini 키와 녹음은 들어가지 않아요.', cancelled: '' } as const;

// 내보내기: 저장 문장·단어장·진도·기록·설정이 들어가고 Gemini 키와 녹음은 빠진다.
// 공유 시트(파일 앱·에어드롭)를 먼저 쓰고, 안 되는 기기에서만 내려받기 (library/saveFile.ts)
function ExportBlock() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      const text = buildBackup(await collectBackupData());
      setMessage(SAVE_MESSAGE[await saveTextFile(backupFileName(), text, 'application/json')]);
    } catch (e) {
      setMessage(`백업을 만들지 못했어요: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SettingsRow name="Backup Export" disabled={busy} onClick={save} />
      {message && <div className={styles.detail}><p className={styles.keyState} lang="ko" role="status">{message}</p></div>}
    </>
  );
}

export function BackupSection() {
  return (
    <>
      <ExportBlock />
      <RestoreBlock />
      <ResetBlock />
    </>
  );
}
