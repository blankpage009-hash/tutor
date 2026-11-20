import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { contentUrl } from '../../content/loader';
import type { RolePlayLine } from '../../content/lessonTypes';
import { playAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';

// 롤플레이 상대 카드의 ▶: 그 상대 대사만 다시 듣기 (디자인 v2 07, 사용자 결정 2026-11-20).
// 진행 중이면 먼저 멈추고, 마이크가 다 닫힌 뒤에 소리를 낸다 — 마이크가 켜진 채 재생하면
// iOS가 통화 모드로 바뀌어 잡음이 생기고, 마이크가 상대 목소리를 내 대답으로 듣는다.
// 다시 듣기가 끝나도 저절로 이어 가지 않는다: iOS는 탭한 순간 만든 오디오 장치에만 마이크 소리를 주므로
// 사용자가 마이크를 눌러 이어 간다 (화면 라벨 TAP TO ANSWER)
export function useRolePlayReplay(lines: RolePlayLine[], stop: () => void, run: MutableRefObject<Promise<void>>) {
  const [playing, setPlaying] = useState<number | null>(null);
  // 새로 누르면 번호표가 바뀌어, 앞서 누른 재생이 끝나며 "재생 끝"으로 바꾸지 않게 한다
  const token = useRef(0);

  useEffect(() => () => {
    token.current += 1;
    stopAudio(); // 화면을 나가면 다시 듣기도 멈춘다
  }, []);

  const replay = useCallback(async (i: number) => {
    const line = lines[i];
    if (line?.speaker !== 'partner' || !line.audio) return;
    unlockAudio(); // iOS: 탭한 순간 먼저
    const t = ++token.current;
    setPlaying(i);
    stop();
    await run.current.catch(() => undefined);
    if (token.current !== t) return;
    await playAudio(contentUrl(line.audio), 1).catch((e) => console.debug(`[롤플레이] 다시 듣기 실패: ${String(e)}`));
    if (token.current === t) setPlaying(null);
  }, [lines, stop, run]);

  return { playing, replay };
}
