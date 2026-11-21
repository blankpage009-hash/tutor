"""단어 저장 창 🔊용 단어 발음 음성 만들기 (2026-11-21, 단어 사전 2단계).

실행: .venv\\Scripts\\python.exe scripts\\audio\\make_word_audio.py
- content/dictionary-src/words/*.json의 표제어마다 튜터 목소리로 발음을 만든다
  → content/audio/dict/<단어>-<지문8자>.m4a (이미 있으면 건너뜀)
- 결과 목록(단어 → 파일 경로)을 content/dictionary-src/audio.json에 쓴다
  → 그다음 node scripts/content/build-dictionary.mjs를 돌리면 사전에 붙는다.
- audio/dict/ 안에서 더 이상 안 쓰는 파일만 지운다.

시험 녹음: --audition → .audio-tmp/word-audition/에 몇 단어만 두 가지 말투로 만든다 (앱에 안 들어감).
"""
import json
import sys

from make_audio import Builder, fingerprint, word_slug
from tts_common import ROOT, TMP_DIR, find_ffmpeg, measure_lufs

CONTENT = ROOT / 'content'
WORDS_SRC = CONTENT / 'dictionary-src' / 'words'
AUDIO_JSON = CONTENT / 'dictionary-src' / 'audio.json'
AUDIO_DIR = CONTENT / 'audio' / 'dict'

# 레슨 음성과 같은 튜터 목소리 (make_lesson_audio.py VOICE)
VOICE = 'google:en-US-Chirp3-HD-Sadachbia'
# 한 단어만 보내면 끝이 올라가 질문처럼 들릴 수 있어 마침표를 붙인다 (시험 녹음 뒤 사용자 결정, 2026-11-21)
SUFFIX = '.'
# 마침표를 붙이면 무음으로 나오는 단어 ("a."가 -70 LUFS). 실행 끝에 무음 검사가 새로 찾아 준다
PLAIN_WORDS = {'a', 'er'}
# 이보다 작으면 무음으로 본다 (정상 파일은 -18.5 근처)
SILENT_LUFS = -45
# 한 번 실행으로 무료 범위(월 100만 자)를 크게 쓰지 않게 막는 안전장치. 지금 전체가 수천 자라 넉넉하다
MAX_NEW_CHARS = 50_000

# 시험 녹음 단어: 아주 짧은 기능어, 뜻에 따라 발음이 바뀌는 단어(read·live), 긴 단어를 섞었다
AUDITION_WORDS = ['a', 'the', 'i', 'go', 'read', 'live', 'can', 'get', 'coffee', 'comfortable']
AUDITION_STYLES = {'plain': '', 'period': '.'}


def headwords():
  heads = []
  for f in sorted(WORDS_SRC.glob('*.json')):
    data = json.loads(f.read_text(encoding='utf-8-sig'))
    heads += [h for h in data if not h.startswith('_')]
  return sorted(set(heads))


def spoken(head, suffix=None):
  # 대문자 I는 소문자로 보내면 글자 이름이 아니라 다른 말로 읽힐 수 있어 원래 모양으로 보낸다
  word = 'I' if head == 'i' else head
  if suffix is None:
    suffix = '' if head in PLAIN_WORDS else SUFFIX
  return word + suffix


def silent_files(rels):
  ffmpeg = find_ffmpeg()
  out = []
  for head, rel in rels.items():
    lufs = measure_lufs(ffmpeg, CONTENT / rel)
    if lufs is None or lufs < SILENT_LUFS:
      out.append(head)
  return out


def audition():
  b = Builder(VOICE)
  out_dir = TMP_DIR / 'word-audition'
  for head in AUDITION_WORDS:
    for style, suffix in AUDITION_STYLES.items():
      # Builder.ensure는 content/ 기준 경로를 받지만, 절대 경로를 주면 그 자리에 만든다 (content 밖 시험 폴더)
      b.ensure(out_dir / f'{word_slug(head)}-{style}.m4a', spoken(head, suffix))
  print(f'시험 녹음 {b.made}개 만듦 ({b.chars}자): {out_dir}')


def plan(heads):
  counter = Builder(VOICE, plan_only=True)
  for head in heads:
    counter.ensure(rel_path(head), spoken(head))
  return counter.chars


def rel_path(head):
  return f'audio/dict/{word_slug(head)}-{fingerprint(spoken(head), VOICE)}.m4a'


def prune(used):
  removed = 0
  for f in AUDIO_DIR.glob('*.m4a') if AUDIO_DIR.exists() else []:
    if f.relative_to(CONTENT).as_posix() not in used:
      f.unlink()
      removed += 1
  return removed


def main():
  if '--audition' in sys.argv:
    return audition()
  heads = headwords()
  new_chars = plan(heads)
  print(f'표제어 {len(heads)}개, 새로 보낼 글자 {new_chars}자')
  if new_chars > MAX_NEW_CHARS and '--allow-large' not in sys.argv:
    raise SystemExit(f'{MAX_NEW_CHARS}자를 넘어 멈춥니다. 그래도 만들려면 --allow-large')
  b = Builder(VOICE)
  result = {}
  fresh = {}
  for head in heads:
    rel = rel_path(head)
    existed = (CONTENT / rel).exists()
    b.ensure(rel, spoken(head))
    result[head] = rel
    if not existed:
      fresh[head] = rel
  # 무음 파일이 앱에 들어가면 🔊을 눌러도 아무 소리가 안 나니, 목록에서 빼고 알려 준다
  silent = silent_files(fresh)
  for head in silent:
    (CONTENT / result.pop(head)).unlink()
  if silent:
    print(f'무음으로 나와 뺀 단어 {len(silent)}개 → PLAIN_WORDS에 넣고 다시 실행: {" ".join(silent)}')
  AUDIO_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
  removed = prune(b.used)
  print(f'새로 만듦 {b.made} · 지움 {removed} · 전체 {len(result)}개 → {AUDIO_JSON.relative_to(ROOT)}')


if __name__ == '__main__':
  main()
