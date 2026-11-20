// 화면 주소 목록. 라우터, 임시 이동 목록, 테스트가 함께 쓴다.
export type ScreenMeta = {
  id: string;
  path: string;
  title: string;
  kind: 'tab' | 'sub' | 'practice';
  phase: string;
};

export const SCREENS: ScreenMeta[] = [
  { id: 'home', path: '/', title: '오늘의 연습', kind: 'tab', phase: 'Phase 7' },
  { id: 'courses', path: '/courses', title: '코스', kind: 'tab', phase: 'Phase 5' },
  { id: 'library', path: '/library', title: '보관함', kind: 'tab', phase: 'Phase 5' },
  { id: 'vocab', path: '/vocab', title: '단어장', kind: 'tab', phase: 'Phase 5' },
  { id: 'prompt', path: '/prompt', title: '프롬프트 만들기', kind: 'tab', phase: 'Phase 6' },
  { id: 'settings', path: '/settings', title: '설정', kind: 'sub', phase: 'Phase 7' },
  // 진도 요약은 설정 맨 위로 합쳤고, 이 화면은 그 요약의 "All Levels" 하위 화면이다
  { id: 'progress', path: '/settings/progress', title: '전체 레벨', kind: 'sub', phase: 'Phase 7.95' },
  { id: 'start-level', path: '/settings/start-level', title: '시작 레벨', kind: 'sub', phase: 'Phase 7.95' },
  { id: 'gemini-key', path: '/settings/gemini-key', title: 'Gemini 키', kind: 'sub', phase: 'Phase 7.95' },
  { id: 'review', path: '/review', title: '복습', kind: 'practice', phase: 'Phase 5' },
  { id: 'quiz', path: '/vocab/quiz', title: '단어 퀴즈', kind: 'practice', phase: 'Phase 5' },
  { id: 'roleplay', path: '/roleplay', title: '롤플레잉', kind: 'practice', phase: 'Phase 6' }
];

export const TABS = [
  { path: '/', label: '오늘', icon: 'today' },
  { path: '/courses', label: '코스', icon: 'courses' },
  { path: '/library', label: '보관함', icon: 'library' },
  { path: '/vocab', label: '단어장', icon: 'vocab' },
  { path: '/prompt', label: '프롬프트', icon: 'prompt' }
] as const;
