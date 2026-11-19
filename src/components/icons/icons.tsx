import type { SVGProps } from 'react';

// 선 굵기 1.75, 모서리 각짐 — design/handoff.md 6절 규칙
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props} />
  );
}

export const IconToday = () => <Svg><rect x="4" y="5" width="16" height="15" /><path d="M4 10h16M9 3v4M15 3v4" /></Svg>;
export const IconCourses = () => <Svg><path d="M4 5h6v14H4zM14 5h6v14h-6z" /></Svg>;
export const IconLibrary = () => <Svg><path d="M6 4h12v16l-6-4-6 4z" /></Svg>;
export const IconVocab = () => <Svg><path d="M4 6h16M4 12h16M4 18h10" /></Svg>;
export const IconPrompt = () => <Svg><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></Svg>;
// 가로줄 3개 + 손잡이 네모 (디자인 v2 홈 오른쪽 위 설정 아이콘)
export const IconSettings = () => (
  <Svg><path d="M4 7h16M4 12h16M4 17h16" /><path d="M9 5v4M15 10v4M8 15v4" /></Svg>
);
export const IconFlame = () => (
  <Svg width="18" height="18"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.5 1 2 2 2 0-3-1-5 1-8z" /></Svg>
);
export const IconClose = () => <Svg><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconChevronLeft = () => <Svg><path d="M15 5l-7 7 7 7" /></Svg>;
export const IconChevronRight = () => <Svg><path d="M9 5l7 7-7 7" /></Svg>;
export const IconMic = () => <Svg><rect x="9" y="3" width="6" height="11" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Svg>;
export const IconPlay = () => <Svg><path d="M8 5l11 7-11 7z" fill="currentColor" /></Svg>;
export const IconPause = () => <Svg><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" /></Svg>;
export const IconReplay = () => <Svg><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" /></Svg>;
export const IconSkipNext = () => <Svg><path d="M6 5l9 7-9 7z" fill="currentColor" /><path d="M18 5v14" /></Svg>;
export const IconBookmark = ({ filled = false }: { filled?: boolean }) => (
  <Svg><path d="M6 4h12v16l-6-4-6 4z" fill={filled ? 'currentColor' : 'none'} /></Svg>
);
export const IconCheck = () => <Svg><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const IconStop = () => <Svg><rect x="7" y="7" width="10" height="10" fill="currentColor" /></Svg>;

export const TAB_ICONS = {
  today: IconToday,
  courses: IconCourses,
  library: IconLibrary,
  vocab: IconVocab,
  prompt: IconPrompt
} as const;
