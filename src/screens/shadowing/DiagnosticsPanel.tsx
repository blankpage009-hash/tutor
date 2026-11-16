import { useEffect, useState } from 'react';
import { countCachedAudio } from '../../speech/audioCache';
import { hasAudioSession } from '../../speech/audioSession';
import { isRecognitionSupported } from '../../speech/recognizer';
import styles from './Shadowing.module.css';

// Phase 4 1세션째 아이폰 확인용 패널. 확인이 끝나면(2세션째) 화면에서 뺀다.
type Props = {
  recordWhileListening: boolean;
  onRecordWhileListening: (on: boolean) => void;
  audioSessionOn: boolean;
  onAudioSessionOn: (on: boolean) => void;
  logs: string[];
};

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone) || window.matchMedia('(display-mode: standalone)').matches;
}

export function DiagnosticsPanel(p: Props) {
  const [cached, setCached] = useState(0);
  useEffect(() => {
    countCachedAudio().then(setCached).catch(() => undefined);
  }, [p.logs.length]);

  return (
    <details className={styles.diag}>
      <summary>진단 (아이폰 확인용)</summary>
      <ul className={styles.diagFacts} lang="ko">
        <li>홈화면 앱 모드: {isStandalone() ? '예' : '아니요'}</li>
        <li>음성 인식: {isRecognitionSupported() ? '있음' : '없음'}</li>
        <li>오디오 세션 기능: {hasAudioSession() ? '있음' : '없음'}</li>
        <li>보관된 음성 파일: {cached}개</li>
      </ul>
      <label className={styles.diagRow}>
        <input type="checkbox" checked={p.recordWhileListening}
          onChange={(e) => p.onRecordWhileListening(e.target.checked)} />
        말하는 동안 내 목소리 같이 녹음
      </label>
      <label className={styles.diagRow}>
        <input type="checkbox" checked={p.audioSessionOn}
          onChange={(e) => p.onAudioSessionOn(e.target.checked)} />
        녹음 뒤 소리 크기 되돌리기 (오디오 세션 조정)
      </label>
      <ol className={styles.diagLog}>
        {p.logs.map((l, i) => <li key={i}>{l}</li>)}
      </ol>
    </details>
  );
}
