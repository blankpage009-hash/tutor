import { describe, expect, it } from 'vitest';
import { addPass, clearedIds, isCleared, isReachable, justCleared } from './lessonSteps';

describe('통과 횟수', () => {
  it('통과할 때마다 하나씩 센다', () => {
    let c = addPass(new Map(), 'a');
    c = addPass(c, 'a');
    expect(c.get('a')).toBe(2);
  });

  it('필요 횟수를 채워야 끝낸 문장이 된다', () => {
    const once = addPass(new Map(), 'a');
    expect(isCleared(once, 'a', 1)).toBe(true);
    expect(isCleared(once, 'a', 2)).toBe(false);
    expect(clearedIds(addPass(once, 'a'), 2)).toEqual(new Set(['a']));
  });

  it('자동 넘기기는 필요 횟수를 막 채운 통과에서만', () => {
    const none = new Map<string, number>();
    expect(justCleared(none, 'a', 1)).toBe(true);
    expect(justCleared(none, 'a', 2)).toBe(false);
    expect(justCleared(addPass(none, 'a'), 'a', 2)).toBe(true);
    // 이미 끝낸 문장을 다시 연습할 때는 넘어가지 않는다
    expect(justCleared(addPass(none, 'a'), 'a', 1)).toBe(false);
  });

  it('앞 문장을 끝내야 다음 문장을 고를 수 있다', () => {
    const ids = ['a', 'b', 'c'];
    expect(isReachable(ids, 0, new Set())).toBe(true);
    expect(isReachable(ids, 1, new Set())).toBe(false);
    expect(isReachable(ids, 1, new Set(['a']))).toBe(true);
    expect(isReachable(ids, 2, new Set(['a']))).toBe(false);
  });
});
