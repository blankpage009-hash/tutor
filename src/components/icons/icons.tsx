import type { SVGProps } from 'react';

// 선 굵기 1.75, 모서리 각짐 — design/handoff.md 6절 규칙
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props} />
  );
}

// 하단 탭 아이콘은 모서리·끝이 둥근 모양(디자인 v2 시안). 각진 기본 Svg와 달리 round로 덮어씀
const ROUND = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconToday = () => (
  <Svg {...ROUND}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></Svg>
);
export const IconCourses = () => (
  <Svg {...ROUND}><circle cx="6" cy="5" r="3" /><circle cx="18" cy="19" r="3" /><path d="M9 5h8.5a3.5 3.5 0 0 1 0 7h-11a3.5 3.5 0 0 0 0 7H15" /></Svg>
);
export const IconLibrary = () => (
  <Svg {...ROUND}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Svg>
);
export const IconVocab = () => <Svg {...ROUND}><path d="M21 5H3M15 12H3M17 19H3" /></Svg>;
export const IconPrompt = () => (
  <Svg {...ROUND}><path d="M22 17a2 2 0 0 1-2 2H6.8a2 2 0 0 0-1.4.6l-2.2 2.2A.7.7 0 0 1 2 21.3V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /><path d="M7 11h10M7 15h6" /></Svg>
);
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
// 마이크는 시안(디자인 v2)처럼 끝이 둥근 캡슐 모양 (사용자 요청 2026-11-20)
export const IconMic = () => (
  <Svg {...ROUND}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></Svg>
);
export const IconPlay = () => <Svg><path d="M8 5l11 7-11 7z" fill="currentColor" /></Svg>;
export const IconPause = () => <Svg><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" /></Svg>;
export const IconReplay = () => <Svg><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" /></Svg>;
export const IconSkipNext = () => <Svg><path d="M6 5l9 7-9 7z" fill="currentColor" /><path d="M18 5v14" /></Svg>;
export const IconBookmark = ({ filled = false }: { filled?: boolean }) => (
  <Svg><path d="M6 4h12v16l-6-4-6 4z" fill={filled ? 'currentColor' : 'none'} /></Svg>
);
export const IconCheck = () => <Svg><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const IconStop = () => <Svg><rect x="7" y="7" width="10" height="10" fill="currentColor" /></Svg>;
// 드릴 카드 화면 왼쪽 위 "문장 목록으로" (디자인 v2 06)
export const IconList = () => <Svg><path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1" /></Svg>;
// 롤플레이 "예시 보기" 전구 (디자인 v2 07)
export const IconBulb = () => (
  <Svg {...ROUND}><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" /></Svg>
);

// 레슨 4단계 아이콘 (디자인 v2 레슨 화면·홈 단계 타일): 설명 / 대화문 / 드릴 / 롤플레이
export const IconBook = () => (
  <Svg width="22" height="22"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></Svg>
);
export const IconChat = () => <Svg width="22" height="22"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>;
export const IconRepeat = () => (
  <Svg width="22" height="22"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></Svg>
);
export const IconUsers = () => (
  <Svg width="22" height="22"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>
);

export const TAB_ICONS = {
  today: IconToday,
  courses: IconCourses,
  library: IconLibrary,
  vocab: IconVocab,
  prompt: IconPrompt
} as const;
