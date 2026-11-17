"""콘텐츠 음성 파일 만들기.

실행: .venv\\Scripts\\python.exe scripts\\audio\\make_audio.py
- content/manifest.json의 모든 코스에서 문장·변형·튜터 대사·단어 음성을 만든다.
- 이미 있는 파일은 건너뛴다 → 문장을 고치면 그 문장만 새로 만들어진다.
- 코스 JSON의 "audio" 칸을 채우고, 더 이상 안 쓰는 옛 음성 파일은 지운다.
"""
import hashlib
import json
import re
import sys

from tts_common import ROOT, TMP_DIR, encode_m4a, find_ffmpeg, load_voice, synth_wav

CONTENT = ROOT / 'content'
VOICE = 'en_US-ryan-high'
# 1.0이 기본 속도. 앱에서 재생 속도로 느리게 들려주므로 원본은 자연스러운 속도로 둔다
LENGTH_SCALE = 1.0


def fingerprint(text):
  # 음성 설정까지 지문에 넣어, 목소리나 속도를 바꾸면 모든 파일이 새로 만들어지게 한다
  raw = f'{VOICE}|{LENGTH_SCALE}|{text}'.encode('utf-8')
  return hashlib.sha1(raw).hexdigest()[:8]


def word_slug(text):
  return re.sub(r'[^a-z0-9]+', '-', text.lower().replace("'", '')).strip('-')


def spoken_items(course):
  # validate-core.mjs의 listSpokenItems와 같은 순서·규칙
  for lesson in course['lessons']:
    for s in lesson['sentences']:
      yield s, s['id'], s['en'], False
      for v in s['variations']:
        yield v, v['id'], v['en'], False
      for w in s['vocab']:
        yield w, None, w.get('lemma') or w['word'], True
    for t in lesson['roleplay']['turns']:
      if t['speaker'] == 'tutor':
        yield t, t['id'], t['en'], False


def audio_path(course_id, item_id, text, is_word):
  if is_word:
    # 단어는 코스가 달라도 소리가 같으므로 한 파일을 같이 쓴다
    return f'audio/words/{word_slug(text)}-{fingerprint(text)}.m4a'
  return f'audio/{course_id}/{item_id}-{fingerprint(text)}.m4a'


def is_scalar_only(value):
  items = value.values() if isinstance(value, dict) else value
  return all(not isinstance(v, (dict, list)) for v in items)


def dump(value, indent=0):
  """사람이 읽기 쉬운 JSON: 글자·숫자만 담은 짧은 묶음은 한 줄로 쓴다."""
  pad = '  ' * indent
  if isinstance(value, (dict, list)) and value:
    one_line = json.dumps(value, ensure_ascii=False, separators=(', ', ': '))
    if is_scalar_only(value) and len(one_line) + len(pad) <= 220:
      return one_line.replace('{"', '{ "').replace('"}', '" }')
    inner = '  ' * (indent + 1)
    if isinstance(value, dict):
      parts = [f'{inner}{json.dumps(k, ensure_ascii=False)}: {dump(v, indent + 1)}' for k, v in value.items()]
      return '{\n' + ',\n'.join(parts) + f'\n{pad}}}'
    parts = [f'{inner}{dump(v, indent + 1)}' for v in value]
    return '[\n' + ',\n'.join(parts) + f'\n{pad}]'
  return json.dumps(value, ensure_ascii=False)


class Builder:
  def __init__(self):
    self.voice = None
    self.ffmpeg = find_ffmpeg()
    self.made = 0
    self.used = set()

  def ensure(self, rel_path, text):
    self.used.add(rel_path)
    out = CONTENT / rel_path
    if out.exists():
      return
    if self.voice is None:
      # 모델 로드는 몇 초 걸리므로, 새로 만들 파일이 있을 때만 한 번 불러온다
      self.voice = load_voice(VOICE)
    wav = TMP_DIR / 'build.wav'
    synth_wav(self.voice, text, wav, LENGTH_SCALE)
    encode_m4a(self.ffmpeg, wav, out)
    self.made += 1
    if self.made % 50 == 0:
      print(f'  ...{self.made}개 만듦')

  def build_course(self, course):
    for obj, item_id, text, is_word in spoken_items(course):
      rel = audio_path(course['id'], item_id, text, is_word)
      self.ensure(rel, text)
      obj['audio'] = rel


def prune(used):
  removed = 0
  for f in (CONTENT / 'audio').rglob('*.m4a'):
    rel = f.relative_to(CONTENT).as_posix()
    # 새 커리큘럼 음성(audio/lessons/)은 make_lesson_audio.py가 관리하므로 여기서 지우지 않는다
    if rel.startswith('audio/lessons/'):
      continue
    if rel not in used:
      f.unlink()
      removed += 1
  return removed


def main():
  manifest = json.loads((CONTENT / 'manifest.json').read_text(encoding='utf-8'))
  b = Builder()
  for entry in manifest['courses']:
    path = CONTENT / entry['file']
    course = json.loads(path.read_text(encoding='utf-8'))
    print(f'코스 {course["id"]}')
    b.build_course(course)
    path.write_text(dump(course) + '\n', encoding='utf-8')
  removed = prune(b.used) if '--keep' not in sys.argv else 0
  total = sum(f.stat().st_size for f in (CONTENT / 'audio').rglob('*.m4a'))
  print(f'새로 만듦 {b.made} · 지움 {removed} · 전체 {len(b.used)}개 · {total / 1e6:.2f}MB')


if __name__ == '__main__':
  main()
