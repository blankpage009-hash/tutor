import { useCallback, useEffect, useRef, useState } from 'react';
import { contentUrl } from '../../content/loader';
import { playAudio, stopAudio, unlockAudio } from '../../speech/audioPlayer';

// 대화문·롤플레이 줄. 롤플레이 내 줄은 음성이 없다(자유 답변)
export type PlayableLine = { speaker: 'partner' | 'me'; audio?: string };

// 대화문 줄을 차례로 틀어 준다. 새 재생을 시작하거나 멈추면 번호표(token)가 바뀌어
// 앞서 돌던 순서는 다음 줄로 넘어가지 않고 조용히 끝난다
export function useLinePlayer(lines: PlayableLine[]) {
  const [playing, setPlaying] = useState<number | null>(null);
  const token = useRef(0);

  const stop = useCallback(() => {
    token.current += 1;
    stopAudio(); // 재생 중이던 약속이 바로 끝난다
    setPlaying(null);
  }, []);

  useEffect(() => stop, [stop]); // 화면을 나가면 멈춘다

  const playLine = useCallback(async (i: number, t: number) => {
    if (token.current !== t) return false;
    setPlaying(i);
    const audio = lines[i].audio;
    if (audio) await playAudio(contentUrl(audio), 1).catch((e) => console.debug(`[대화문] 재생 실패: ${String(e)}`));
    return token.current === t;
  }, [lines]);

  // 전체 듣기: 탭한 순간 불러야 iOS가 재생을 허락한다
  const playAll = useCallback(async () => {
    unlockAudio();
    const t = ++token.current;
    for (let i = 0; i < lines.length; i += 1) {
      if (!(await playLine(i, t))) return false;
    }
    setPlaying(null);
    return true;
  }, [lines, playLine]);

  // from부터 상대 줄을 이어서 틀고, 내 줄(또는 끝)에 닿으면 그 번호를 돌려준다. 중간에 멈추면 null
  const playPartners = useCallback(async (from: number) => {
    const t = ++token.current;
    let i = from;
    while (i < lines.length && lines[i].speaker === 'partner') {
      if (!(await playLine(i, t))) return null;
      i += 1;
    }
    setPlaying(null);
    return i;
  }, [lines, playLine]);

  return { playing, playAll, playPartners, stop };
}
