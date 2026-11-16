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
export const IconMore = () => <Svg><path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" /></Svg>;
export const IconClose = () => <Svg><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconChevronLeft = () => <Svg><path d="M15 5l-7 7 7 7" /></Svg>;
export const IconChevronRight = () => <Svg><path d="M9 5l7 7-7 7" /></Svg>;
export const IconMic = () => <Svg><rect x="9" y="3" width="6" height="11" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Svg>;
export const IconStop = () => <Svg><rect x="7" y="7" width="10" height="10" fill="currentColor" /></Svg>;

export const TAB_ICONS = {
  today: IconToday,
  courses: IconCourses,
  library: IconLibrary,
  vocab: IconVocab,
  more: IconMore
} as const;
