import { describe, expect, it } from 'vitest';
import { runRolePlay, type RolePlayLoopDeps, type RpHear } from './rolePlayLoop';

type L = { no: number; me: boolean };
const LINES: L[] = [{ no: 1, me: false }, { no: 2, me: true }, { no: 3, me: false }, { no: 4, me: true }];

// 내 줄에서 들을 때마다 hears에서 하나씩 꺼내 준다. 일어난 일은 log에 남긴다
function setup(hears: RpHear[], over: Partial<RolePlayLoopDeps<L>> = {}) {
  const log: string[] = [];
  let stop = false;
  const d: RolePlayLoopDeps<L> = {
    lines: LINES, start: 0, isMine: (l) => l.me, stopped: () => stop,
    onLine: (i) => log.push(`줄${i}`),
    play: async (l) => { log.push(`재생${l.no}`); },
    hear: async (l) => { const r = hears.shift() ?? 'passed'; log.push(`듣기${l.no}:${r}`); return r; },
    afterPass: async () => { log.push('쉼'); },
    ...over
  };
  return { d, log, stopNow: () => { stop = true; } };
}

describe('롤플레이 자동 진행', () => {
  it('상대 줄 재생 → 내 줄 통과 → 끝까지', async () => {
    const t = setup(['passed', 'passed']);
    expect(await runRolePlay(t.d)).toBe('done');
    expect(t.log).toEqual(['줄0', '재생1', '줄1', '듣기2:passed', '쉼', '줄2', '재생3', '줄3', '듣기4:passed', '쉼']);
  });

  it('틀리거나 말이 없으면 다시 듣고, 건너뛰면 쉬지 않고 다음 줄', async () => {
    const t = setup(['failed', 'no-speech', 'passed', 'skipped']);
    expect(await runRolePlay(t.d)).toBe('done');
    expect(t.log.filter((x) => x.startsWith('듣기'))).toEqual(['듣기2:failed', '듣기2:no-speech', '듣기2:passed', '듣기4:skipped']);
    expect(t.log.filter((x) => x === '쉼')).toHaveLength(1);
  });

  it('멈춘 줄에서 다시 시작한다', async () => {
    const t = setup(['passed'], { start: 3 });
    expect(await runRolePlay(t.d)).toBe('done');
    expect(t.log).toEqual(['줄3', '듣기4:passed', '쉼']);
  });

  it('듣는 중에 멈추면 결과를 버리고 끝난다', async () => {
    const t = setup([]);
    t.d.hear = async () => { t.stopNow(); return 'passed'; };
    expect(await runRolePlay(t.d)).toBe('stopped');
    expect(t.log).not.toContain('쉼');
  });

  it('상대 줄 재생 중에 멈추면 다음 줄로 가지 않는다', async () => {
    const t = setup([]);
    t.d.play = async () => { t.stopNow(); };
    expect(await runRolePlay(t.d)).toBe('stopped');
    expect(t.log).toEqual(['줄0']);
  });
});
