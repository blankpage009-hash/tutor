import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentUrl } from '../../content/loader';
import type { RolePlayLine } from '../../content/lessonTypes';
import { playAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';
import { createCaptureContext } from '../../speech/pcmCapture';

type Start = (from: number, tapCtx?: AudioContext | null) => boolean;

// 롤플레이 상대 카드의 ▶: 그 상대 대사 다시 듣기 (디자인 v2 07, 사용자 결정 2026-11-20).
// 진행 중이면 먼저 멈추고, 마이크가 다 닫힌 뒤 그 상대 줄부터 다시 진행한다 — 진행 순서가 상대 줄을
// 마이크를 닫은 채 틀고(통화 모드 잡음·상대 목소리를 내 대답으로 듣는 것 방지), 끝나면 내 차례에 마이크를 저절로 연다
// (사용자 요청 2026-11-20: 다시 듣기 뒤 마이크를 다시 누르지 않게).
// iOS는 탭한 순간 만든 오디오 장치에만 마이크 소리를 주므로, 장치는 ▶를 누른 바로 그때 만들어 넘긴다
export function useRolePlayReplay(
  lines: RolePlayLine[], stop: () => void, run: MutableRefObject<Promise<void>>, start: Start
) {
  const [playing, setPlaying] = useState<number | null>(null);
  // 새로 누르면 번호표가 바뀌어, 앞서 누른 다시 듣기가 뒤늦게 진행을 시작하지 않게 한다
  const token = useRef(0);

  useEffect(() => () => {
    token.current += 1;
    stopAudio(); // 화면을 나가면 다시 듣기도 멈춘다
  }, []);

  const replay = useCallback(async (i: number) => {
    const line = lines[i];
    if (line?.speaker !== 'partner' || !line.audio) return;
    unlockAudio(); // iOS: 탭한 순간 먼저
    const ctx = createCaptureContext();
    const t = ++token.current;
    setPlaying(i);
    stop();
    await run.current.catch(() => undefined);
    if (token.current !== t) {
      ctx?.close().catch(() => undefined);
      return;
    }
    setPlaying(null);
    if (start(i, ctx)) return;
    // 음성 인식이 아직 준비 안 됐으면 소리만 들려준다 (안내 문구는 start가 띄운다)
    setPlaying(i);
    await playAudio(contentUrl(line.audio), 1).catch((e) => console.debug(`[롤플레이] 다시 듣기 실패: ${String(e)}`));
    if (token.current === t) setPlaying(null);
  }, [lines, stop, run, start]);

  return { playing, replay };
}
