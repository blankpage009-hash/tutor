"""음성 생성 공통 함수 (audition.py, make_audio.py가 함께 쓴다).

PC에서만 실행하는 제작 도구다. 앱에는 들어가지 않는다.
"""
import base64
import glob
import json
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parents[2]
VOICES_DIR = ROOT / '.voices'
TMP_DIR = ROOT / '.audio-tmp'

# 말 속도에 맞춰 32kbps 모노면 귀로 듣기에 충분하고, 전체 50MB 목표 안에 들어온다
AAC_BITRATE = '32k'
SAMPLE_RATE = '22050'


def find_ffmpeg():
  # winget 설치 직후에는 현재 창의 PATH에 ffmpeg가 안 잡혀서, 설치 폴더를 직접 찾는다
  env = os.environ.get('FFMPEG')
  if env:
    return env
  found = shutil.which('ffmpeg')
  if found:
    return found
  pattern = os.path.expandvars(
    r'%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin\ffmpeg.exe')
  hits = glob.glob(pattern)
  if hits:
    return hits[0]
  raise SystemExit('ffmpeg를 찾지 못했습니다. FFMPEG 환경 변수에 ffmpeg.exe 경로를 넣어주세요.')


def load_voice(name):
  model = VOICES_DIR / f'{name}.onnx'
  if not model.exists():
    raise SystemExit(f'음성 모델이 없습니다: {model}')
  return PiperVoice.load(model)


def synth_wav(voice, text, wav_path, length_scale=1.0):
  wav_path.parent.mkdir(parents=True, exist_ok=True)
  with wave.open(str(wav_path), 'wb') as wav_file:
    voice.synthesize_wav(text, wav_file, SynthesisConfig(length_scale=length_scale))


# 키는 저장소 밖에만 둔다 (CLAUDE.md: 키를 소스·저장소에 넣지 않는다)
GOOGLE_KEY_FILE = Path.home() / '.tutor-keys' / 'google-tts.txt'
GOOGLE_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'


def load_google_key():
  if not GOOGLE_KEY_FILE.exists():
    raise SystemExit(f'Google 키 파일이 없습니다: {GOOGLE_KEY_FILE}')
  # 메모장으로 저장하면 맨 앞에 보이지 않는 BOM 글자가 붙어서 utf-8-sig로 읽는다
  key = GOOGLE_KEY_FILE.read_text(encoding='utf-8-sig').strip()
  if not key:
    raise SystemExit(f'Google 키 파일이 비어 있습니다: {GOOGLE_KEY_FILE}')
  return key


def _google_request(key, body):
  req = urllib.request.Request(GOOGLE_URL, data=body, method='POST',
                               headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': key})
  with urllib.request.urlopen(req, timeout=60) as r:
    return json.load(r)


def google_synth_wav(key, voice_name, text, wav_path, retries=5):
  lang = '-'.join(voice_name.split('-')[:2])
  body = json.dumps({
    'input': {'text': text},
    'voice': {'languageCode': lang, 'name': voice_name},
    'audioConfig': {'audioEncoding': 'LINEAR16', 'sampleRateHertz': 24000},
  }).encode('utf-8')
  for attempt in range(retries):
    try:
      data = _google_request(key, body)
      break
    except urllib.error.HTTPError as e:
      # 429(요청이 몰림)·5xx(서버 사정)는 잠깐 쉬었다 다시 보낸다. 키 오류 같은 나머지는 바로 멈춘다
      if (e.code != 429 and e.code < 500) or attempt == retries - 1:
        raise SystemExit(f'Google 음성 만들기 실패 ({e.code}): {e.read().decode("utf-8", "replace")[:300]}')
    except urllib.error.URLError as e:
      if attempt == retries - 1:
        raise SystemExit(f'Google에 연결하지 못했습니다: {e.reason}')
    time.sleep(2 ** attempt)
  wav_path.parent.mkdir(parents=True, exist_ok=True)
  # LINEAR16 응답은 WAV 머리말까지 들어 있어 그대로 저장하면 된다
  wav_path.write_bytes(base64.b64decode(data['audioContent']))


# 앞뒤 무음을 잘라 파일을 작게 하고, 앞에 0.1초만 다시 붙인다.
# iOS는 재생 시작 직후 첫 소리가 살짝 잘리는 경우가 있어 짧은 여유를 둔다.
_FILTER = ','.join([
  'silenceremove=start_periods=1:start_threshold=-50dB',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-50dB',
  'areverse',
  'adelay=100',
  'apad=pad_dur=0.15',
])


def measure_lufs(ffmpeg, wav_path):
  # ebur128 요약의 "I:"(전체 소리 크기, LUFS)를 읽는다. 무음 구간은 측정에서 알아서 빠진다
  result = subprocess.run([ffmpeg, '-hide_banner', '-nostats', '-i', str(wav_path), '-af', 'ebur128',
                           '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='replace')
  values = [line.split()[1] for line in result.stderr.splitlines() if line.strip().startswith('I:')]
  return float(values[-1]) if values else None


def _loudness_filter(ffmpeg, wav_path, target_lufs):
  measured = measure_lufs(ffmpeg, wav_path)
  # 측정이 안 되거나 거의 무음이면 키우지 않는다 (잡음만 커진다)
  if measured is None or measured < -60:
    return ''
  gain = target_lufs - measured
  # 키우면 큰 소리가 0dB를 넘어 찌그러질 수 있어, 바로 아래에서 눌러 준다
  return f',volume={gain:.2f}dB,alimiter=limit=0.97:level=false'


def encode_m4a(ffmpeg, wav_path, out_path, target_lufs=None):
  # target_lufs: Google 음성은 문장마다 크기가 들쭉날쭉하고 옛 음성보다 약 7dB 작아서 한 크기로 맞춘다
  out_path.parent.mkdir(parents=True, exist_ok=True)
  audio_filter = _FILTER + (_loudness_filter(ffmpeg, wav_path, target_lufs) if target_lufs is not None else '')
  cmd = [ffmpeg, '-y', '-loglevel', 'error', '-i', str(wav_path), '-af', audio_filter,
       '-ac', '1', '-ar', SAMPLE_RATE, '-c:a', 'aac', '-b:a', AAC_BITRATE,
       '-movflags', '+faststart', str(out_path)]
  subprocess.run(cmd, check=True)
