// 롤플레이 자동 진행 순서 (사용자 결정 2026-11-18). 화면(React)과 떼어 두어 시험으로 확인한다.
// 상대 줄은 재생 → 내 줄은 듣기: 통과면 잠깐 보여 주고 다음 줄, 건너뛰면 다음 줄,
// 틀리거나 말이 없으면 바로 다시 듣는다. 멈춤을 누르면 끝난다.

export type RpHear = 'passed' | 'failed' | 'no-speech' | 'skipped';
export type RpEnd = 'done' | 'stopped';

export type RolePlayLoopDeps<L> = {
  lines: L[];
  start: number; // 시작할 줄 번호 (멈췄던 줄에서 다시 시작)
  isMine: (l: L) => boolean;
  stopped: () => boolean;
  onLine: (i: number) => void; // 화면을 이 줄로
  play: (l: L) => Promise<void>;
  hear: (l: L) => Promise<RpHear>; // 한 번 듣고 판정해 화면에 보여 준 뒤 결과를 알려 준다
  afterPass: () => Promise<void>; // 통과 글자를 잠깐 보여 주는 동안 기다림
};

type Turn = 'next' | 'stopped';

async function myTurn<L>(d: RolePlayLoopDeps<L>, l: L): Promise<Turn> {
  for (;;) {
    const r = await d.hear(l);
    // 멈춤을 누른 순간 듣던 결과는 버린다
    if (d.stopped()) return 'stopped';
    if (r === 'skipped') return 'next';
    if (r === 'passed') {
      await d.afterPass();
      return d.stopped() ? 'stopped' : 'next';
    }
  }
}

export async function runRolePlay<L>(d: RolePlayLoopDeps<L>): Promise<RpEnd> {
  for (let i = d.start; i < d.lines.length; i++) {
    if (d.stopped()) return 'stopped';
    const l = d.lines[i];
    d.onLine(i);
    if (!d.isMine(l)) {
      await d.play(l);
      continue;
    }
    if ((await myTurn(d, l)) === 'stopped') return 'stopped';
  }
  return d.stopped() ? 'stopped' : 'done';
}
