import { describe, expect, it, vi } from 'vitest';
import { runHandsFree, type HandsFreeDeps, type HearStatus } from './handsFreeLoop';

// 듣기 결과를 차례로 내놓는 가짜. 무엇을 했는지 순서대로 적어 둔다
function setup(results: HearStatus[], over: Partial<HandsFreeDeps<string>> = {}) {
  const calls: string[] = [];
  const queue = [...results];
  const deps: HandsFreeDeps<string> = {
    sentences: ['s1', 's2', 's3'],
    start: 0,
    maxFails: 3,
    slowRate: 0.75,
    failFeedback: true,
    stopped: () => false,
    play: async (s, rate) => { calls.push(`play ${s} ${rate}`); },
    hear: async (s) => { calls.push(`hear ${s}`); return queue.shift() ?? 'error'; },
    recordPass: () => true,
    advance: vi.fn(),
    ...over
  };
  return { deps, calls };
}

describe('손 안 대고 이어 말하기 순서', () => {
  it('통과하면 다음 문장을 튜터가 읽고 듣고, 마지막을 통과하면 끝난다', async () => {
    const { deps, calls } = setup(['passed', 'passed', 'passed']);
    expect(await runHandsFree(deps)).toBe('done');
    expect(calls).toEqual(['play s1 1', 'hear s1', 'play s2 1', 'hear s2', 'play s3 1', 'hear s3']);
    expect(deps.advance).toHaveBeenCalledTimes(3);
  });

  it('틀리면 느리게 들려준 뒤 보통 속도로 다시 읽지 않고 바로 듣는다', async () => {
    const { deps, calls } = setup(['failed', 'passed', 'passed', 'passed']);
    expect(await runHandsFree(deps)).toBe('done');
    expect(calls.slice(0, 5)).toEqual(['play s1 1', 'hear s1', 'play s1 0.75', 'hear s1', 'play s2 1']);
  });

  it('같은 문장에서 3번 연속 떨어지면 멈춘다', async () => {
    const { deps, calls } = setup(['failed', 'failed', 'failed']);
    expect(await runHandsFree(deps)).toBe('too-many-fails');
    expect(calls.filter((c) => c.startsWith('hear'))).toHaveLength(3);
    expect(calls.at(-1)).toBe('hear s1'); // 3번째 실패 뒤에는 느린 재생도 안 한다
  });

  it('통과하면 연속 실패 수가 처음부터 다시 센다', async () => {
    const { deps } = setup(['failed', 'failed', 'passed', 'failed', 'failed', 'passed', 'passed']);
    expect(await runHandsFree(deps)).toBe('done');
  });

  it('말이 없으면 멈춘다', async () => {
    const { deps } = setup(['passed', 'no-speech']);
    expect(await runHandsFree(deps)).toBe('no-speech');
  });

  it('반복 횟수를 다 못 채웠으면 같은 문장을 다시 읽는다', async () => {
    const passes = [false, true, true, true];
    const { deps, calls } = setup(['passed', 'passed', 'passed', 'passed'], { recordPass: () => passes.shift() ?? true });
    expect(await runHandsFree(deps)).toBe('done');
    expect(calls.slice(0, 4)).toEqual(['play s1 1', 'hear s1', 'play s1 1', 'hear s1']);
  });

  it('중간 문장에서 시작할 수 있다', async () => {
    const { deps, calls } = setup(['passed', 'passed'], { start: 1 });
    expect(await runHandsFree(deps)).toBe('done');
    expect(calls[0]).toBe('play s2 1');
  });

  it('드릴: 먼저 읽지 않을 회차는 바로 듣는다', async () => {
    const { deps, calls } = setup(['passed', 'passed', 'passed'], { shouldRead: (s) => s !== 's2' });
    expect(await runHandsFree(deps)).toBe('done');
    expect(calls).toEqual(['play s1 1', 'hear s1', 'hear s2', 'play s3 1', 'hear s3']);
  });

  it('드릴: 먼저 읽을 소리를 바꿀 수 있다 (상황 응답 cue)', async () => {
    const { deps, calls } = setup(['passed', 'passed', 'passed'], {
      readFirst: async (s) => { calls.push(`cue ${s}`); }
    });
    expect(await runHandsFree(deps)).toBe('done');
    expect(calls.slice(0, 2)).toEqual(['cue s1', 'hear s1']);
  });

  it('드릴: 1~2번 실패는 소리 없이 다시, 3번째에 느리게 들려주고 멈추지 않는다', async () => {
    const { deps, calls } = setup(['failed', 'failed', 'failed', 'passed', 'passed', 'passed'], {
      failFeedback: false, onTooManyFails: 'slow-and-continue'
    });
    expect(await runHandsFree(deps)).toBe('done');
    expect(calls.slice(0, 6)).toEqual(['play s1 1', 'hear s1', 'hear s1', 'hear s1', 'play s1 0.75', 'hear s1']);
  });

  it('드릴: 느리게 들려준 뒤 실패 수는 0부터 다시 센다', async () => {
    const results: HearStatus[] = ['failed', 'failed', 'failed', 'failed', 'failed', 'failed', 'passed', 'passed', 'passed'];
    const { deps, calls } = setup(results, { failFeedback: false, onTooManyFails: 'slow-and-continue' });
    expect(await runHandsFree(deps)).toBe('done');
    expect(calls.filter((c) => c === 'play s1 0.75')).toHaveLength(2);
  });

  it('멈춤을 누르면 그 순간 듣던 결과는 기록하지 않는다', async () => {
    let stop = false;
    const recordPass = vi.fn(() => true);
    const { deps } = setup([], {
      stopped: () => stop,
      hear: async () => { stop = true; return 'passed'; },
      recordPass
    });
    expect(await runHandsFree(deps)).toBe('stopped');
    expect(recordPass).not.toHaveBeenCalled();
  });
});
