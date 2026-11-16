import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
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

// 사용자가 채팅에 그대로 붙여 넣을 수 있게 기록을 글자로 복사한다 (스크린샷은 길면 잘리므로)
async function copyLogs(facts: string[], logs: string[]): Promise<string> {
  const text = [...facts, `UA: ${navigator.userAgent}`, '---', ...[...logs].reverse()].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    return '복사했어요. 채팅창에 붙여 넣어 주세요.';
  } catch {
    return '복사가 안 됐어요. 기록 화면을 스크린샷으로 보내 주세요.';
  }
}

export function DiagnosticsPanel(p: Props) {
  const [cached, setCached] = useState(0);
  const [copyMsg, setCopyMsg] = useState('');
  useEffect(() => {
    countCachedAudio().then(setCached).catch(() => undefined);
  }, [p.logs.length]);
  const facts = [
    `홈화면 앱 모드: ${isStandalone() ? '예' : '아니요'}`,
    `동시 녹음: ${p.recordWhileListening ? '켬' : '끔'}, 오디오 세션 조정: ${p.audioSessionOn ? '켬' : '끔'}`,
    `보관된 음성 파일: ${cached}개`
  ];

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
      <div className={styles.diagRow}>
        <Button size="sm" onClick={() => copyLogs(facts, p.logs).then(setCopyMsg)}>기록 복사</Button>
        <span lang="ko">{copyMsg}</span>
      </div>
      <ol className={styles.diagLog}>
        {p.logs.map((l, i) => <li key={i}>{l}</li>)}
      </ol>
    </details>
  );
}
