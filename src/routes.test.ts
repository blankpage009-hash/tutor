import { describe, expect, it } from 'vitest';
import { SCREENS, TABS } from './routes';

describe('화면 목록', () => {
  it('화면 12개가 모두 있다 (설정 하위 화면 시작 레벨·Gemini 키 추가, 튜터 이름 화면은 없음)', () => {
    expect(SCREENS).toHaveLength(12);
  });

  it('주소가 겹치지 않는다', () => {
    const paths = SCREENS.map((s) => s.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('탭은 오늘·코스·보관함·단어장·프롬프트 5개다', () => {
    expect(TABS.map((t) => t.path)).toEqual(['/', '/courses', '/library', '/vocab', '/prompt']);
  });

  it('더보기 주소는 남아 있지 않다', () => {
    expect(SCREENS.some((s) => s.path.startsWith('/more'))).toBe(false);
    expect(TABS.some((t) => t.path.startsWith('/more'))).toBe(false);
  });
});
