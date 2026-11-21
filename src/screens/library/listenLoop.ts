// 보관함 "듣기만" 순서 (사용자 요청 2026-11-21): 카드 소리 재생 → 잠깐 쉼 → 다음 카드 → … 끝.
// 말하기·판정이 없어 마이크를 켜지 않는다. 화면(React)과 떼어 두어 시험으로 확인한다.
export type ListenEnd = 'done' | 'stopped';

export type ListenDeps<S> = {
  items: S[];
  start: number; // 화면에서 보고 있던 카드부터
  stopped: () => boolean;
  hasAudio: (s: S) => boolean; // 음성 경로가 없던 옛 저장 문장은 재생 없이 쉼만 두고 넘어간다
  play: (s: S) => Promise<void>;
  wait: (ms: number) => Promise<void>; // 멈춤을 누르면 바로 끝나야 한다 (부른 쪽이 처리)
  leadInMs: number; // ▶를 누르자마자 소리가 나면 화면을 볼 새가 없어 첫 재생 전에만 쉰다 (드릴과 같은 규칙)
  gapMs: number; // 문장 사이 쉼: 들은 문장을 속으로 되새길 틈
  advance: () => void; // 화면을 다음 카드로 (마지막 카드면 끝 화면)
};

export async function runListenLoop<S>(d: ListenDeps<S>): Promise<ListenEnd> {
  await d.wait(d.leadInMs);
  for (let i = d.start; i < d.items.length; i++) {
    if (d.stopped()) return 'stopped';
    const s = d.items[i];
    if (d.hasAudio(s)) await d.play(s);
    if (d.stopped()) return 'stopped';
    await d.wait(d.gapMs);
    if (d.stopped()) return 'stopped';
    d.advance();
  }
  return 'done';
}
