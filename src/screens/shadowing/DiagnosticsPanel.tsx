import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { countCachedAudio } from '../../speech/audioCache';
import { hasAudioSession } from '../../speech/audioSession';
import { isRecognitionSupported } from '../../speech/recognizer';
import styles from './Shadowing.module.css';

// Phase 4 1세션째 아이폰 확인용 패널. 확인이 끝나면(2세션째) 화면에서 뺀다.
type Props = {
  vosk: boolean;
  onVosk: (on: boolean) => void;
  voskState: string;
  secondOpinion: boolean;
  onSecondOpinion: (on: boolean) => void;
  locked: boolean; // 듣는 중에는 인식 방식을 못 바꾸게 (두 인식기가 마이크를 다투지 않게)
  rawMic: boolean;
  onRawMic: (on: boolean) => void;
  micOff: boolean;
  onMicOff: (on: boolean) => void;
  boost: boolean;
  onBoost: (on: boolean) => void;
  recordWhileListening: boolean;
  onRecordWhileListening: (on: boolean) => void;
  audioSessionOn: boolean;
  onAudioSessionOn: (on: boolean) => void;
  pcmFallback: boolean;
  onPcmFallback: (on: boolean) => void;
  warmUpMic: boolean;
  onWarmUpMic: (on: boolean) => void;
  ios27Fix: boolean;
  onIos27Fix: (on: boolean) => void;
  logs: string[];
};

type SwitchProps = { label: string; on: boolean; onChange: (on: boolean) => void; disabled?: boolean };

function Switch({ label, on, onChange, disabled }: SwitchProps) {
  return (
    <label className={styles.diagRow}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

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
    `인식: ${p.vosk ? `앱 안(Vosk, 모델 ${p.voskState})` : '아이폰 내장'}, 두 번째 의견: ${p.secondOpinion ? '켬' : '끔'}`,
    `마이크 소리 처리(에코 제거·잡음 억제): ${p.rawMic ? '끔(⑧ 켬)' : '켬'}`,
    `⑨ 튜터가 읽는 동안 마이크 끄기: ${p.micOff ? '켬' : '끔'}, ⑩ 처리 없는 마이크 소리 키우기: ${p.boost ? (p.rawMic ? '켬' : '켬(⑧ 꺼져 있어 효과 없음)') : '끔'}`,
    `동시 녹음: ${p.recordWhileListening ? '켬' : '끔'}, 오디오 세션 조정: ${p.audioSessionOn ? '켬' : '끔'}`,
    `직접 녹음: ${p.pcmFallback ? '켬' : '끔'}, 마이크 준비 운동: ${p.warmUpMic ? '켬' : '끔'}`,
    `준비 말(iOS 27 대응): ${p.ios27Fix ? '켬' : '끔'}`,
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
      <Switch label="⑥ 앱 안 인식 사용 (끄면 아이폰 내장 인식)" on={p.vosk} onChange={p.onVosk} disabled={p.locked} />
      <Switch label="⑦ 떨어지면 두 번째 의견 (문장 단어만 허용으로 한 번 더)" on={p.secondOpinion} onChange={p.onSecondOpinion} />
      <Switch label="⑧ 마이크 소리 처리 끄기 (에코 제거·잡음 억제, 다음 마이크부터)" on={p.rawMic} onChange={p.onRawMic} disabled={p.locked} />
      <Switch label="⑨ 이어 말하기: 튜터가 읽는 동안 마이크 끄기 (튜터 목소리 잡음 비교)" on={p.micOff} onChange={p.onMicOff} disabled={p.locked} />
      <Switch label="⑩ 처리 없는 마이크 소리 25배 키우기 (⑧과 함께, 다음 마이크부터)" on={p.boost} onChange={p.onBoost} disabled={p.locked} />
      <Switch label="④ 마이크 뒤 소리 크기 되돌리기 (오디오 세션 조정)" on={p.audioSessionOn} onChange={p.onAudioSessionOn} />
      <p className={styles.diagRow} lang="ko">아래 ①②③⑤는 ⑥을 껐을 때(내장 인식)만 쓰여요.</p>
      <Switch label="① 말하는 동안 내 목소리 같이 녹음" on={p.recordWhileListening} onChange={p.onRecordWhileListening} />
      <Switch label="② 직접 녹음도 같이 (Web Audio)" on={p.pcmFallback} onChange={p.onPcmFallback} />
      <Switch label="③ 말하기 전마다 마이크 따로 열었다 닫기" on={p.warmUpMic} onChange={p.onWarmUpMic} />
      <Switch label="⑤ 말하기 전 준비 말 + 중간에 안 끊기 (iOS 27 대응)" on={p.ios27Fix} onChange={p.onIos27Fix} />
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
