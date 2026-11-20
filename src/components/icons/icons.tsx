import type { SVGProps } from 'react';

// 선 굵기 1.75, 모서리 각짐 — design/handoff.md 6절 규칙
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props} />
  );
}

// 둥근 모양이 필요한 일반 아이콘(마이크·전구 등)용. 기본 Svg는 각진 모양이라 round로 덮어씀
const ROUND = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

// 하단 탭 아이콘 5개는 사용자가 준 탭바 캡처(2026-11-20)를 픽셀 단위로 재서 그대로 옮김.
// 오늘: 모서리 각진 달력, 고리 2개가 윗변을 뚫고 안쪽까지 내려옴
export const IconToday = () => (
  <Svg><rect x="4" y="5" width="16" height="15" /><path d="M9 3v4M15 3v4M4 10h16" /></Svg>
);
// 코스: 오른쪽 위 → 왼쪽 아래로 내려오는 S자 길, 가운데에 채운 점
export const IconCourses = () => (
  <Svg>
    <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="19" r="2.5" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    <path d="M15.5 5H6.5a3.5 3.5 0 0 0 0 7h11a3.5 3.5 0 0 1 0 7H8.5" />
  </Svg>
);
// 보관함 탭만은 복습 타일의 북마크(IconBookmark)처럼 모서리가 각진 모양 (사용자 요청 2026-11-20). ROUND 안 씀
export const IconLibrary = () => (
  <Svg><path d="M6 4h12v16l-6-4-6 4z" /></Svg>
);
// 단어장: 왼쪽 정렬 가로줄 3개(긴·긴·짧은), 줄 끝은 캡처처럼 평평하게(butt)
export const IconVocab = () => (
  <Svg strokeLinecap="butt"><path d="M3 6h18M3 12h18M3 18h12" /></Svg>
);
// 프롬프트: 모서리 살짝 둥근 말풍선, 꼬리는 왼쪽 아래로 뾰족하게. 안쪽 줄은 짧은·긴 순서
export const IconPrompt = () => (
  <Svg strokeLinecap="butt">
    <path d="M3.5 21V4a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7.5z" />
    <path d="M6.5 8h8M6.5 12h12" />
  </Svg>
);
// 가로줄 3개에 손잡이가 서로 다른 위치에 끼운 슬라이더 모양 (사용자가 준 디자인 시안 그대로).
// 손잡이 자리 양옆을 비우려고 줄을 둘로 나눠 그렸고, 줄 끝이 시안처럼 평평하도록 butt로 지정
export const IconSettings = () => (
  <Svg strokeLinecap="butt" strokeLinejoin="miter">
    <path d="M3 5h7M14 5h7M14 3v4" />
    <path d="M3 12h5M12 12h9M8 10v4" />
    <path d="M3 19h9M16 19h5M16 17v4" />
  </Svg>
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
// data-icon: 글자 붙은 버튼에서 삼각형의 빈 여백을 빼는 CSS(Button.module.css)가 이 표식으로 찾는다
export const IconPlay = () => <Svg data-icon="play"><path d="M8 5l11 7-11 7z" fill="currentColor" /></Svg>;
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

// 디자인 v2 08~11 (복습·보관함·단어장·퀴즈)
export const IconEye = () => (
  <Svg {...ROUND}><path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const IconExport = () => <Svg><path d="M12 3v12M17 8l-5-5-5 5M21 15v6H3v-6" /></Svg>;
export const IconHeadphones = () => (
  <Svg {...ROUND}><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" /></Svg>
);
export const IconShuffle = () => (
  <Svg {...ROUND}><path d="m18 14 4 4-4 4M18 2l4 4-4 4" /><path d="M2 18h2a4 4 0 0 0 3.3-1.7l5.4-8.6A4 4 0 0 1 16 6h6M2 6h2a4 4 0 0 1 3.6 2.2M22 18h-6a4 4 0 0 1-3.3-1.8l-.4-.45" /></Svg>
);
// 밀어서 나오는 줄 버튼: 지우기 / 뜻 고치기
export const IconTrash = () => <Svg><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" /></Svg>;
export const IconEdit = () => <Svg><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" /></Svg>;
// 고른 줄 표시 (보관함 길게 눌러 고르기)
export const IconCircle = ({ checked = false }: { checked?: boolean }) => (
  <Svg {...ROUND}>
    <circle cx="12" cy="12" r="9" fill={checked ? 'currentColor' : 'none'} />
    {checked && <path d="m8 12.5 3 3 5-6" stroke="var(--on-accent)" />}
  </Svg>
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
