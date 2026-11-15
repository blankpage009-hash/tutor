"""음성 생성 공통 함수 (audition.py, make_audio.py가 함께 쓴다).

PC에서만 실행하는 제작 도구다. 앱에는 들어가지 않는다.
"""
import glob
import os
import shutil
import subprocess
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


def encode_m4a(ffmpeg, wav_path, out_path):
  out_path.parent.mkdir(parents=True, exist_ok=True)
  cmd = [ffmpeg, '-y', '-loglevel', 'error', '-i', str(wav_path), '-af', _FILTER,
       '-ac', '1', '-ar', SAMPLE_RATE, '-c:a', 'aac', '-b:a', AAC_BITRATE,
       '-movflags', '+faststart', str(out_path)]
  subprocess.run(cmd, check=True)
