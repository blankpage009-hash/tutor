import { describe, expect, it } from 'vitest';
import { runListenLoop, type ListenDeps } from './listenLoop';

type Item = { id: string; audio: string };

function setup(items: Item[], start = 0, stopAfterPlays = Infinity) {
  const log: string[] = [];
  let stopped = false;
  const d: ListenDeps<Item> = {
    items, start, leadInMs: 1000, gapMs: 1500,
    stopped: () => stopped,
    hasAudio: (s) => s.audio !== '',
    play: async (s) => {
      log.push(`play ${s.id}`);
      if (log.filter((l) => l.startsWith('play')).length >= stopAfterPlays) stopped = true;
    },
    wait: async (ms) => { log.push(`wait ${ms}`); },
    advance: () => log.push('next')
  };
  return { d, log };
}

describe('보관함 듣기만 순서', () => {
  it('첫 재생 전만 1초 쉬고, 재생 → 쉼 → 다음을 끝까지 돈다', async () => {
    const { d, log } = setup([{ id: 'a', audio: 'a.m4a' }, { id: 'b', audio: 'b.m4a' }]);
    expect(await runListenLoop(d)).toBe('done');
    expect(log).toEqual(['wait 1000', 'play a', 'wait 1500', 'next', 'play b', 'wait 1500', 'next']);
  });

  it('보고 있던 카드부터 시작한다', async () => {
    const { d, log } = setup([{ id: 'a', audio: 'a' }, { id: 'b', audio: 'b' }], 1);
    await runListenLoop(d);
    expect(log.filter((l) => l.startsWith('play'))).toEqual(['play b']);
  });

  it('소리 없는 카드는 재생 없이 쉼만 두고 넘어간다', async () => {
    const { d, log } = setup([{ id: 'a', audio: '' }]);
    await runListenLoop(d);
    expect(log).toEqual(['wait 1000', 'wait 1500', 'next']);
  });

  it('재생 중 멈춤을 누르면 다음으로 넘기지 않고 끝난다', async () => {
    const { d, log } = setup([{ id: 'a', audio: 'a' }, { id: 'b', audio: 'b' }], 0, 1);
    expect(await runListenLoop(d)).toBe('stopped');
    expect(log).toEqual(['wait 1000', 'play a']);
  });
});
