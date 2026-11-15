# 콘텐츠 형식 (schemaVersion 1)

앱이 읽는 학습 콘텐츠의 "서식 규칙"이다. 엑셀 표의 칸 이름을 미리 정해두는 것과 같다.
칸 이름이 정해져 있어야 앱(Phase 3~)이 어느 칸에서 영어 문장을, 어느 칸에서 한국어 뜻을 꺼낼지 안다.

## 1. 파일 구조

```
content/
  manifest.json          ← 코스 목록(목차). 여기에 한 줄 추가하면 앱에 코스가 나타난다
  courses/
    beginner.json        ← 코스 1개 = 파일 1개
    ...
  audio/
    beginner/            ← 코스별 문장·변형·튜터 대사 음성
    words/               ← 단어 음성 (모든 코스가 같이 씀)
```

## 2. manifest.json

```json
{
  "schemaVersion": 1,
  "courses": [
    { "id": "beginner", "file": "courses/beginner.json", "order": 1,
      "title": "Beginner", "titleKo": "초급", "level": 1 }
  ]
}
```

| 칸 | 뜻 |
|---|---|
| `id` | 코스 고유 이름(영문 소문자·숫자·하이픈). 코스 파일 안의 `id`와 같아야 한다 |
| `file` | `content/` 기준 코스 파일 경로 |
| `order` | 목록에 보일 순서 |
| `title` / `titleKo` | 영어 / 한국어 코스 이름 |
| `level` | 난이도 1~4 (1 초급 · 2 중급 · 3 고급 · 4 마스터). 주제 코스도 대략의 난이도를 적는다 |

## 3. 코스 파일 (`courses/*.json`)

```json
{
  "schemaVersion": 1,
  "id": "beginner",
  "idPrefix": "beg",
  "title": "Beginner", "titleKo": "초급",
  "level": 1,
  "register": "casual",
  "description": "코스 소개 한두 줄 (한국어)",
  "lessons": [ 수업, 수업, ... ]
}
```

- `idPrefix`: 이 코스 안의 모든 id 앞에 붙는 짧은 이름. 코스끼리 id가 겹치지 않게 한다.
- `register`: `casual`(축약·가벼운 슬랭 허용) 또는 `formal`(비즈니스 격식체).

### 3.1 수업 (lesson)

| 칸 | 뜻 |
|---|---|
| `id` | `beg-01` 처럼 `idPrefix-두자리번호` |
| `title` / `titleKo` | 수업 제목 |
| `intro` | 수업 시작할 때 튜터가 하는 말 1~2줄 (한국어) |
| `sentences` | 핵심 문장 3개 |
| `roleplay` | 이 수업 문장을 써보는 짧은 상황극 1개 |

### 3.2 핵심 문장 (sentence)

| 칸 | 뜻 |
|---|---|
| `id` | `beg-01-s1` (`수업id-s번호`) |
| `en` | 영어 문장 (쉐도잉·판정 기준) |
| `ko` | 자연스러운 한국어 뜻 |
| `note` | 뉘앙스·쓰는 상황, 튜터 말투 2~3줄 (한국어) |
| `hintWords` | 복습 때 빈칸으로 가릴 핵심 단어. **문장에 실제로 있는 단어**만, 중요한 것부터 |
| `vocab` | 단어장용 뜻풀이 목록. 항목: `word`(문장에 나온 그대로), `lemma`(기본형, 다를 때만), `ko`, `pos` |
| `variations` | 바꿔 말하기 3개 |
| `audio` | 음성 파일 경로 (음성 스크립트가 자동으로 채움. **없어도 됨**) |

`pos`(품사) 값: `noun` `verb` `adjective` `adverb` `pronoun` `preposition` `conjunction` `interjection` `phrase` `phrasal-verb` `idiom`

### 3.3 변형 (variation)

| 칸 | 뜻 |
|---|---|
| `id` | `beg-01-s1-v1` |
| `type` | `situation`(상황 교체) · `subject`(주어/목적어 교체) · `tense`(시제 교체) — 가능하면 세 가지를 하나씩 |
| `en` / `ko` | 바뀐 문장과 뜻 |
| `audio` | 자동으로 채움 (없어도 됨) |

### 3.4 롤플레잉 (roleplay)

```json
{
  "id": "beg-01-r",
  "situation": "상황 설명 (한국어)",
  "tutorRole": "튜터 역할", "myRole": "내 역할",
  "turns": [
    { "id": "beg-01-r-t1", "speaker": "tutor", "en": "...", "ko": "...", "audio": "..." },
    { "speaker": "me", "sentenceId": "beg-01-s1" }
  ]
}
```

- 튜터 대사는 글을 직접 적는다. **내 대사는 핵심 문장을 id로 가리킨다** → 같은 음성·판정을 다시 쓰고, 문장을 고치면 대본도 같이 바뀐다.
- 4~6줄. 그 수업의 핵심 문장 3개를 모두 내 대사로 한 번씩 쓴다.

## 4. 꼭 지킬 규칙

1. **id는 한 번 정하면 바꾸지 않는다.** 저장 문장·복습 일정(SRS)이 id로 연결되기 때문에, id가 바뀌면 그 문장의 복습 기록이 끊긴다. 문장을 지울 때도 번호를 당기지 말고 빈 번호로 둔다.
2. 모든 id는 전체 코스에서 하나뿐이어야 한다.
3. **튜터 이름을 콘텐츠에 쓰지 않는다.** 설정에서 이름을 바꿀 수 있기 때문.
4. `audio`는 선택 칸이다. 설정에서 불러온 코스, Gemini로 만든 문장에는 음성이 없고 앱은 글자로만 보여준다.
5. 음성 인식이 알아듣기 쉬운 문장으로 쓴다 (판정이 "들린 단어 ↔ 정답 단어" 비교이기 때문):
   - 숫자는 글자로 (`3` → `three`)
   - 하이픈 단어, `uh-huh`·`hmm` 같은 감탄 소리, 드문 고유명사는 피한다
   - 축약은 `casual` 코스만. `gonna`, `wanna` 정도는 OK
   - `formal`(비즈니스) 코스도 `I'm`, `I'd`, `we're`, `let's` 같은 표준 축약은 쓴다 (미국 직장 말투에서 자연스러움). `gonna`·`wanna`·`gotta`·`kinda` 같은 구어 축약만 금지

## 5. 음성 파일 이름

`audio/<코스id>/<문장id>-<해시8자>.m4a` — 해시는 "문장 글자 + 음성 설정"으로 만든 지문이다.
문장을 고치면 지문이 바뀌어 새 파일이 생기고, 앱이 저장해둔(캐시) 옛 소리를 틀 일이 없다.
단어 음성은 `audio/words/<단어>.m4a` 하나를 모든 코스가 같이 쓴다.

## 6. 검사 명령

```
node scripts/content/validate.mjs        ← 형식 검사 (오류가 0개여야 함)
node scripts/content/check-quality.mjs   ← 중복·난이도 역전·음성 인식 주의 단어 검사
.venv\Scripts\python.exe scripts\audio\make_audio.py   ← 바뀐 문장만 음성 다시 만들기
node scripts/content/merge-lessons.mjs <코스파일> <수업묶음.json>   ← 나눠 쓴 수업을 코스에 합치기
node scripts/content/make-sample-page.mjs   ← 아이폰 확인용 샘플 페이지(docs/phase2/) 만들기
```

## 7. 앱(Phase 3~)에서 지킬 점

- `content/`는 Vite의 `public/` 밖에 있다. 앱에서 쓰려면 빌드 때 `content/`를 그대로 복사하거나 `publicDir`로 지정한다. 모든 `audio` 경로는 `content/` 기준이다.
- 음성은 전체 약 36MB → PWA가 처음 설치할 때 한꺼번에 받지(precache) 말고, 재생할 때 받아 저장(runtime cache)한다.
- 판정(Phase 4)은 축약을 양쪽으로 맞춰야 한다. 아이폰 받아쓰기는 `should've`를 `should have`로, `how's`를 `how is`로 돌려줄 때가 많다. 콘텐츠에는 gonna, wanna, should've, I'd, how's, it's 등이 들어 있다.
