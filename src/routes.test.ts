import { describe, expect, it } from 'vitest';
import { SCREENS, TABS } from './routes';

describe('화면 목록', () => {
  it('화면 10개가 모두 있다 (옛 10코스 화면 3개는 삭제됨)', () => {
    expect(SCREENS).toHaveLength(10);
  });

  it('주소가 겹치지 않는다', () => {
    const paths = SCREENS.map((s) => s.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('탭은 5개다', () => {
    expect(TABS).toHaveLength(5);
  });
});
