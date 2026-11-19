import { useCallback, useRef } from 'react';
import type { Sentence } from '../../content/types';
import { playFeedback } from '../../speech/feedbackSound';
import { useShadowingAttempt, type AttemptStatus } from '../shadowing/useShadowingAttempt';
import { useVoskModel, type VoskModelState } from '../shadowing/useVoskModel';

// 느린 음성은 따로 만들지 않고 같은 파일을 0.75배로 재생한다 (PLAN Phase 5.5 결정)
export const SLOW_RATE = 0.75;

// 쉐도잉 화면 진단 패널의 기본값과 같다. 새 레슨 화면에는 진단 패널을 두지 않고 이 값으로 고정한다
// (아이폰 결과 10·11차: 앱 안 인식(Vosk)이 연속으로 잘 됨, 녹음은 끔)
const FIXED = {
  engine: 'vosk' as const, secondOpinion: true, micProcessing: true,
  recordWhileListening: false, pcmFallback: false, warmUpMic: false, ios27Fix: true
};

export const ENGINE_NOTE: Record<VoskModelState, string | null> = {
  off: null,
  loading: '음성 인식 준비 중… 처음 한 번만 약 40MB를 받아서 1~2분 걸릴 수 있어요',
  ready: null,
  error: '음성 인식 준비에 실패했어요. 인터넷 연결을 확인하고 앱을 다시 열어 주세요.'
};

type Options = {
  threshold: number;
  failFeedback: boolean; // 틀릴 때마다 느리게 들려줄지 (새 레슨은 끔 — 사용자 결정 2026-11-17)
  onResult: (id: string, status: AttemptStatus) => void;
};

// 새 레슨(대화문·드릴)의 말하기 준비: 인식 모델 + 한 번 듣기. 이어 말하기 표시(handsFreeActive)는
// 드릴의 useHandsFree와 같이 봐야 해서 함께 돌려준다
export function useNewSpeaking(sentence: Sentence | null, o: Options) {
  const log = useCallback((m: string) => console.debug(`[말하기] ${m}`), []);
  const vosk = useVoskModel(true, log);
  const handsFreeActive = useRef(false);
  // 손으로 누르는 말하기(대화문·설명)의 통과/실패 소리 (사용자 요청 2026-11-19). 판정이 나올 때는
  // 이미 마이크를 닫은 뒤라 바로 틀어도 된다. 이어 말하기(드릴)는 이 길을 안 타고 useHandsFree가 직접 튼다
  const onResult = (id: string, status: AttemptStatus) => {
    if (status === 'passed' || status === 'failed') void playFeedback(status === 'passed' ? 'pass' : 'fail');
    o.onResult(id, status);
  };
  const attempt = useShadowingAttempt(sentence, {
    ...FIXED, threshold: o.threshold, failFeedback: o.failFeedback, slowRate: SLOW_RATE,
    voskModel: vosk.model, log, onResult, handsFreeActive
  });
  return {
    attempt, log, handsFreeActive,
    voskReady: vosk.state === 'ready',
    engineNote: ENGINE_NOTE[vosk.state],
    micLocked: vosk.state !== 'ready'
  };
}
