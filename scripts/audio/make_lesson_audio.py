"""새 커리큘럼 레슨을 앱용으로 만드는 "인쇄소".

실행: .venv\\Scripts\\python.exe scripts\\audio\\make_lesson_audio.py
1. 검사(new curriculum/tools/check_lessons.py)를 먼저 돌려, 오류가 있으면 아무것도 만들지 않는다.
2. new curriculum/lessons/**의 레슨마다 Google Chirp 3 HD(Sadachbia) 음성을 만든다
   → content/audio/lessons/<lessonId>/<이름>-<지문8자>.m4a (이미 있으면 건너뜀)
   키는 C:\\Users\\<사용자>\\.tutor-keys\\google-tts.txt에서 읽는다 (저장소 밖).
   새로 보낼 글자가 MAX_NEW_CHARS를 넘으면 만들기 전에 멈춘다 (그래도 만들려면 --allow-large).
3. 앱용 복사본 content/lessons/<레벨코드>/<lessonId>.json을 쓴다 (audio 칸을 실제 경로로 바꿈).
4. CSV로 목차 content/curriculum.json을 만든다 (레슨마다 ready 표시).
5. 더 이상 안 쓰는 레슨 음성·복사본을 지운다 (content/audio/lessons/ 안만 — 기존 코스 음성은 건드리지 않음).
"""
import csv
import json
import re
import subprocess
import sys

from make_audio import Builder, dump, fingerprint
from tts_common import ROOT

SOURCE = ROOT / 'new curriculum'
LESSONS_SRC = SOURCE / 'lessons'
CSV_PATH = SOURCE / 'curriculum' / 'curriculum.csv'
CHECKER = SOURCE / 'tools' / 'check_lessons.py'
CONTENT = ROOT / 'content'
AUDIO_DIR = CONTENT / 'audio' / 'lessons'
LESSONS_OUT = CONTENT / 'lessons'

# new curriculum/CLAUDE.md 규칙. 나머지 레벨은 코드가 정해지면 여기에 추가한다
LEVEL_CODES = {'초급 1': 'BEG1', '초급 2': 'BEG2','중급 1': 'INT1', '중급 2': 'INT2', '중급 3': 'INT3', '고급 1': 'ADV1'}

# 사용자가 16개 목소리를 들어 보고 고름 (2026-11-20). 예전 목소리는 Piper 'en_US-ryan-high'
VOICE = 'google:en-US-Chirp3-HD-Sadachbia'
# Google 무료 범위는 한 달 100만 자. 한 번 실행으로 넘지 않게 여유를 두고 멈춘다
MAX_NEW_CHARS = 200_000


def run_checker():
  # 검사 결과 표를 그대로 보여 주려고 출력을 가로채지 않는다
  result = subprocess.run([sys.executable, str(CHECKER)])
  if result.returncode != 0:
    raise SystemExit('검사에서 오류가 나서 멈춥니다. 위 표의 ERROR를 먼저 고쳐 주세요.')


def load_lessons():
  # samples/의 정답 예시는 lessons/에 복사본이 따로 있으므로 lessons/만 읽는다 (두 번 처리 방지)
  return [json.loads(p.read_text(encoding='utf-8-sig')) for p in sorted(LESSONS_SRC.rglob('*.json'))]


# 음성 합성기(Piper)가 호칭 약자를 이상하게 읽는다 (사용자 아이폰 확인 2026-11-17: "Dr. Lee").
# 소리를 만들 때만 풀어 쓴다. 화면 글자와 앱용 JSON의 en은 원고 그대로 둔다
SPOKEN_ABBR = [(r'\bDr\.', 'Doctor'), (r'\bMrs\.', 'Missus'), (r'\bMr\.', 'Mister'), (r'\bMs\.', 'Miz')]


def spoken(text):
  for pattern, word in SPOKEN_ABBR:
    text = re.sub(pattern, word, text)
  return text


def fill_audio(builder, lesson):
  lid = lesson['lessonId']

  def make(name, text):
    # 경로 문자열을 한 번만 만들어 파일 저장과 JSON에 같이 쓴다.
    # Windows는 대소문자를 무시하지만 GitHub Pages는 구분해서, 따로 만들면 아이폰에서만 깨질 수 있다
    # 지문도 읽을 글자로 만든다: 읽는 법이 바뀌면 파일 이름이 바뀌어 옛 음성을 다시 쓰지 않는다
    say = spoken(text)
    rel = f'audio/lessons/{lid}/{name}-{fingerprint(say, VOICE)}.m4a'
    builder.ensure(rel, say)
    return rel

  ks = lesson['keySentence']
  key = make('key', ks['en'])
  # 느린 음성은 따로 만들지 않고 앱에서 0.75배로 재생한다 (사용자 결정 2026-11-17)
  ks['audio'] = {'normal': key, 'slow': key}
  for line in lesson['dialogue']['lines']:
    line['audio'] = make(f'dlg-{line["no"]:02d}', line['en'])
  for d in lesson['drills']:
    rel = make(f'drill-{d["id"]:02d}', d['en'])
    d['audio'] = {'normal': rel, 'slow': rel}
    # 영어 질문 cue는 상황 응답 단계에서 들려준다. 한국어 지시문은 글자로만 보여 준다
    if d['cue']['lang'] == 'en':
      d['cue']['audio'] = make(f'cue-{d["id"]:02d}', d['cue']['text'])
  for line in lesson['rolePlay']['lines']:
    # 내 차례(freeResponse)는 내가 자유롭게 말하는 줄이라 음성이 없다
    if 'en' in line:
      line['audio'] = make(f'rp-{line["no"]:02d}', line['en'])


def write_app_copy(lesson, written):
  out = LESSONS_OUT / lesson['levelCode'] / f'{lesson["lessonId"]}.json'
  out.parent.mkdir(parents=True, exist_ok=True)
  out.write_text(dump(lesson) + '\n', encoding='utf-8')
  written.add(out)
  return out.relative_to(CONTENT).as_posix()


def read_csv():
  # 엑셀에서 저장한 CSV라 앞에 BOM이 붙어 있다
  with open(CSV_PATH, encoding='utf-8-sig', newline='') as f:
    return list(csv.DictReader(f))


def level_list(rows):
  # 과정·레벨 순서는 CSV에 처음 나온 순서를 따른다
  seen = []
  for r in rows:
    if r['level'] not in seen:
      seen.append(r['level'])
  return seen


def build_curriculum(rows, ready, declared):
  """ready: {(레벨 이름, 유닛, 레슨): 앱용 파일 경로}, declared: 레슨 파일에 적힌 {레벨 이름: 레벨 코드}"""
  levels = level_list(rows)
  courses, by_level = [], {}
  for r in rows:
    name = r['level']
    if name not in by_level:
      # 임시 이름은 전체 레벨 중 몇 번째인지로 붙인다 → 다른 레벨이 코드를 받아도 번호가 밀리지 않는다
      code = LEVEL_CODES.get(name) or declared.get(name)
      level = {'key': code or f'level-{levels.index(name) + 1:02d}', 'code': code, 'name': name, 'units': []}
      by_level[name] = level
      if not courses or courses[-1]['name'] != r['course']:
        courses.append({'name': r['course'], 'levels': []})
      courses[-1]['levels'].append(level)
    level = by_level[name]
    unit_no, no = int(r['unit_no']), int(r['lesson_no'])
    if not level['units'] or level['units'][-1]['no'] != unit_no:
      level['units'].append({'no': unit_no, 'title': r['unit_title'], 'lessons': []})
    code = level['code']
    file = ready.get((name, unit_no, no))
    lesson = {'no': no, 'title': r['lesson_title'],
              'id': f'{code}-U{unit_no:02d}-L{no:02d}' if code else None, 'ready': bool(file)}
    if file:
      lesson['file'] = file
    level['units'][-1]['lessons'].append(lesson)
  return {'schemaVersion': 1, 'courses': courses}


def prune(used, written):
  removed = 0
  for f in AUDIO_DIR.rglob('*.m4a') if AUDIO_DIR.exists() else []:
    if f.relative_to(CONTENT).as_posix() not in used:
      f.unlink()
      removed += 1
  for f in LESSONS_OUT.rglob('*.json') if LESSONS_OUT.exists() else []:
    if f not in written:
      f.unlink()
      removed += 1
  # 비어 버린 폴더도 정리한다 (깊은 폴더부터)
  for base in (AUDIO_DIR, LESSONS_OUT):
    if base.exists():
      for d in sorted(base.rglob('*'), key=lambda p: len(p.parts), reverse=True):
        if d.is_dir() and not any(d.iterdir()):
          d.rmdir()
  return removed


def check_budget(lessons):
  # 실제로 보내기 전에 글자 수부터 센다. 지문을 바꾸는 실수 하나로 전체를 다시 만들면 무료 범위를 넘을 수 있다
  counter = Builder(VOICE, plan_only=True)
  for lesson in lessons:
    fill_audio(counter, lesson)
  if counter.chars > MAX_NEW_CHARS and '--allow-large' not in sys.argv:
    raise SystemExit(f'새로 보낼 글자가 {counter.chars:,}자로 한도 {MAX_NEW_CHARS:,}자를 넘어 멈춥니다. '
                     '정말 만들려면 --allow-large를 붙여 다시 실행하세요.')
  print(f'새로 보낼 글자 {counter.chars:,}자 (한도 {MAX_NEW_CHARS:,}자)')


def main():
  sys.stdout.reconfigure(encoding='utf-8')
  run_checker()
  lessons = load_lessons()
  check_budget(lessons)
  b = Builder(VOICE)
  ready, declared, written = {}, {}, set()
  for lesson in lessons:
    print(f'레슨 {lesson["lessonId"]}')
    fill_audio(b, lesson)
    ready[(lesson['level'], lesson['unit'], lesson['lessonNo'])] = write_app_copy(lesson, written)
    declared[lesson['level']] = lesson['levelCode']
  curriculum = build_curriculum(read_csv(), ready, declared)
  (CONTENT / 'curriculum.json').write_text(dump(curriculum) + '\n', encoding='utf-8')
  removed = prune(b.used, written)
  total = sum(f.stat().st_size for f in AUDIO_DIR.rglob('*.m4a'))
  print(f'레슨 {len(lessons)}개 · 음성 새로 만듦 {b.made} · 지움 {removed} · 전체 {len(b.used)}개 · '
        f'{total / 1e6:.2f}MB · Google에 보낸 글자 {b.chars:,}자')


if __name__ == '__main__':
  main()
