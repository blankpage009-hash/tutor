# 디자인 v2 handoff — Phase 7.95 화면별 메모

기준 파일: `design/v2/Tutor App Design.html` (Claude Design 번들, 13개 화면 × 라이트/다크).
옛 `design/handoff.md`(v1)는 기능·상태 설명용으로 남겨 두고, **모양은 이 문서가 우선**한다.

## 디자인 파일 보는 법

- 화면으로 보기: `npm run dev` → `http://localhost:5173/tutor/design/v2/Tutor%20App%20Design.html` (개발 서버에서만 열림, file:// 과 배포본에서는 안 열림).
- 값 꺼내기: `py -I design/scripts/unbundle-design.py "design/v2/Tutor App Design.html" <임시폴더>` → `template.html`이 화면 HTML. 화면은 `data-screen-label="01 HOME"` 같은 이름으로 나뉘고, 각 화면에 라이트 폰 → 다크 폰 순서로 들어 있다(다크는 `--bg:#0f1115`로 시작).
- 화면 HTML은 인라인 스타일이라, 값은 `font:600 13px/1 'Barlow Condensed'` 같은 문자열로 찾는다. `class="blueprint"` = 1px 선 테두리 카드.

## 1단계에서 이미 바꾼 것 (기초)

| 무엇 | 값 | 어디 |
|---|---|---|
| 색 | PLAN 7.95 디자인 값 그대로. `line` = 반투명 rgba, 다크 `on-accent`도 흰색 | `design/tokens.json` → `tokens.css` |
| 포커스 테두리 | `accent-ink` (다크 accent `#2d56e0`는 다크 면 위 대비 2.9:1이라 포커스로 못 씀) | tokens.json `focus` |
| 글꼴 | `--font-sans` = Barlow → Apple SD Gothic Neo, `--font-display` = Barlow Condensed → Apple SD Gothic Neo | tokens.json, `src/styles/global.css` @font-face |
| 글꼴 파일 | 라틴 세트 5개(Barlow 400/500/700, Condensed 400/600, 약 110KB), `public/fonts/`, 오프라인 캐시 포함 | `vite.config.ts` globPatterns |
| 글자 스타일 | display 38px Condensed 600 / label 13px Condensed 600 자간 .14em / numeral 44px Condensed 600 / sentence 28px Barlow 500 / title 24px 700 | tokens.json |
| 모서리 | `radius-sm` 2px, `radius-md` 4px (`radius-full`은 스위치·마이크용으로 그대로 — 5~6단계에서 정함) | tokens.json |
| Button | 54px, 2px 모서리, primary = 파랑 채움, secondary = 투명 + 1px `line` 테두리 | `Button.module.css` |
| SegmentedControl | 붙은 칸 한 줄(바깥 1px 선, 칸 사이 1px 선), 고른 칸만 파랑 채움 | `SegmentedControl.module.css` |
| ProgressBar | 빈 부분 = `line` 색. **`segments` 속성**(2~20)을 주면 칸 나뉜 막대(간격 3px) | `ProgressBar.tsx` |
| ScreenHeader | 제목 아래 굵은 줄 없앰, 라벨 6px 위 + 38px 제목 | `ScreenHeader.module.css` |
| TabBar | 배경 = 화면 바탕(`paper`), 위쪽 1px 선만 | `TabBar.module.css` |

남은 대비 경고 2개(일부러 둠): 다크 `accent`(#2d56e0)를 다크 `surface`/`surface-sunk` 위 **그래픽**으로 쓸 때 2.5~2.9:1. 디자인 값이고 흰 글자(5.97:1)는 통과. 진도 막대처럼 accent를 얇은 선으로 쓸 때는 바탕을 `paper`로 두면 3:1 이상.

## 공통 패턴 (모든 단계에서 재사용)

- **작은 라벨**: Barlow Condensed 600 13px, 자간 .14em, 대문자, 보조색(`ink-muted`) 또는 강조색(`accent-ink`). 예: `NOV 19 · THU`, `KEY SENTENCE`, `LINE 4 / 6`. 아주 작은 단계 라벨은 10px 자간 .12em. → `var(--type-label-*)`
- **큰 제목**: Barlow Condensed 600 38px/1.05. → `ScreenHeader` 또는 `var(--type-display-*)`
- **카드**: 모서리 거의 없음, 그림자 없음, `1px solid var(--line)`, 안쪽 여백 16~22px.
- **아이콘 버튼**: 44×44 투명, 누르면 `accent-tint` 배경. 아이콘은 선 굵기 1.5, 24px.
- **큰 버튼**: 54px, 파랑 채움, Barlow 600 17px, 아이콘 18px + 글자.
- **원형 대신 네모**: 디자인에는 둥근 요소가 없다(마이크 76×76, 다시하기/건너뛰기 52×52 모두 네모, 스위치도 네모 50×28). 앱의 둥근 마이크·스위치는 5~6단계에서 바꿀지 그때 보고.
- **설정 줄**: 높이 58px, 아래 1px 선, 왼쪽 이름(Barlow 500 16px), 오른쪽 선택칸(196px 폭, 34px 높이) 또는 스위치 또는 `>`.
- **탭 막대**: 5칸(오늘·코스·보관함·단어장·프롬프트), 아이콘 24px + 11px 글자, 고른 탭만 `accent-ink`·600.

## 화면별 메모

### 01 HOME (2단계)
- 위: `NOV 19 · THU` 라벨 + "Today's Practice" 제목, 오른쪽 위 설정 아이콘(가로줄 3개 + 손잡이 모양).
- 연속일: 불꽃 아이콘 + 숫자(Condensed 17px, 파랑) + "일 연속"(보조색), 오른쪽 `6 / 10`. 그 아래 **10칸 막대** → `ProgressBar segments={goal}`.
- 이어 할 레슨 카드: `중급 1 · UNIT 3`(파랑 라벨) ↔ `L03`(보조색), 한글 제목 700 25px, 유닛 이름 14px 보조색. 4칸 단계 타일(끝냄 = `accent-tint` 바탕 + ✓, 지금 = `accent` 채움 + 흰 글자, 남음 = 보조색) + "Continue Drill" 큰 버튼.
- Review: "Review" 20px Condensed + `TODAY` 라벨, 칸 2개(높이 116px, 숫자 44px 파랑 + "문장"/"단어").

### 02 COURSES (4단계)
- `CURRICULUM` 라벨 + "Courses". 과정 칩 6개(초급~여행) → 레벨 번호 1~4 → 유닛 줄(`U01`, 제목, `5 / 5` 또는 `SOON`, 레슨 진도 네모 5칸).
- 유닛을 누르면 그 자리에서 레슨 목록 펼침(PLAN 결정 2).

### 03 LESSON (4단계)
- 위 X·북마크. `중급 1 · UNIT 3 · L03` 라벨, 제목. KEY SENTENCE 카드(영어 문장 + 한글, 재생 버튼). 4칸 타일(`01 Explanation` … 번호 + 이름, 끝냄 ✓, 다음 단계 강조). 아래 `ABOUT 10 MIN`.

### 04 EXPLANATION (5단계)
- 위쪽 4칸 단계 막대 + 10px 라벨(EXPLANATION·DIALOGUE·DRILL·ROLE-PLAY).
- KEY SENTENCE: 강세 음절을 대문자·파랑으로(`MOR`nings work `BEST` for me.). Listen·Speak 버튼, 북마크.
- 번호 붙은 설명(`01`, `02`), COMMON MISTAKE(틀린 문장 취소선 + `danger` → 맞는 문장 ✓). 아래 "Next: Dialogue".

### 05 DIALOGUE (5단계)
- `LINE 4 / 6`, `접수원 ↔ ME`. 바로 앞 상대 대사(흐리게) + 한글, 내 줄 카드(단어별로 맞힌 단어 강조) + 한글. 아래 다시하기·마이크·건너뛰기, `LISTENING…`.

### 06 DRILL (6단계)
- 위쪽 모드 4칸 막대(REPEAT·READ·RECALL·RESPOND, 각 칸 채움 비율 다름, 지금 모드 라벨만 파랑). `READ · ROUND 5` ↔ `3 / 6`.
- 카드: 포인트 태그(22px 높이, 1px 선, Condensed 12px) + 북마크, 문장 Barlow 500 30px/1.4(맞힌 단어 = `accent-tint` 바탕 + `accent-ink`), `PASS · 96%`.
- 아래 52px 다시하기 · 76px 마이크(파랑 채움) · 52px 건너뛰기, `SWIPE UP · NEXT`.

### 07 ROLE-PLAY (6단계)
- SITUATION 라벨 + 한글 상황. 상대 카드(이름, 영어, 한글). ME 카드: 키워드 칩(`✓ work`, `✓ for me`) + 내 답(키워드 부분 강조). 아래 힌트(전구)·마이크·건너뛰기, `TAP TO ANSWER`.

### 08 REVIEW (7단계)
- 진행 막대 + `3/8`. `KO → EN`, `HINT 1 / 3`. 한글 문장, 첫 글자만 보이는 빈칸(`M w b f m`). Hint · Show Answer 버튼, `SAY IT IN ENGLISH`.

### 09 LIBRARY (7단계)
- `24 SENTENCES` + "Library". Shadow All · Random 버튼. 줄: 영어 + 한글 + 다음 복습 날짜 태그(`TODAY`/`NOV 21`) + 재생. 왼쪽으로 밀어 삭제(2번 눌러 확정). 오른쪽 위 내보내기 아이콘.

### 10 VOCAB (7단계)
- `36 WORDS` + "Vocab". Quiz · 12 · Random. 줄: 단어, 품사(`n.`/`v.`), 뜻, 예문.

### 11 VOCAB QUIZ (7단계)
- 진행 `4/12`. Card · Meaning · Blank 탭(SegmentedControl). 카드: `WORD` 라벨, 단어, 품사, `TAP TO FLIP`. 아래 Didn't Know · Knew It.

### 12 PROMPT (8단계)
- `VOICE CHAT SCRIPT` + "Prompt Generator". SITUATION·PARTNER·ME 입력, `MUST USE · 2` 칩(+ 추가), CORRECTION Later/Instant, FEEDBACK KO/EN(SegmentedControl), PREVIEW(작은 글자 상자), Copy 버튼.

### 13 SETTINGS · PROGRESS (3단계)
- "Settings". PROGRESS: `MY LEVEL` 중급 1, `5 / 6` 칸 막대, STREAK 7 · BEST 12 · TODAY 6/10, `All Levels >`.
- TUTOR: Name `David >`, Speed 0.8/0.9/1.0/1.1. PRACTICE: Pass Score 60~90, Repeats 1~3, Auto Next·Fail Feedback 스위치, Daily Goal 5/10/20/30, Start Level `중급 1 >`. DISPLAY: Theme Auto/Light/Dark. DATA: Gemini Key `•••• 4f2a >`, Backup Export/Import, Reset All(`danger`).
