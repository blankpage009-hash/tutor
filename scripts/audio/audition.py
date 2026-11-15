"""튜터 음성 후보 비교용 샘플 만들기 (1회용).

실행: .venv\\Scripts\\python.exe scripts\\audio\\audition.py
결과: .audio-tmp\\audition\\<음성이름>.m4a
"""
from tts_common import TMP_DIR, encode_m4a, find_ffmpeg, load_voice, synth_wav

CANDIDATES = ['en_US-ryan-high', 'en_US-hfc_male-medium', 'en_US-joe-medium']

# 일상 구어체(축약), 질문 억양, 비즈니스 격식체를 한 번에 들어볼 수 있게 골랐다
SAMPLE_TEXT = ' '.join([
  "Hey, what's up? I'm gonna grab some coffee. Wanna come with me?",
  "I'm not really sure, but I think it's gonna rain later.",
  'Could you please send me the report by Friday afternoon?',
])


def main():
  ffmpeg = find_ffmpeg()
  out_dir = TMP_DIR / 'audition'
  for name in CANDIDATES:
    voice = load_voice(name)
    wav = out_dir / f'{name}.wav'
    synth_wav(voice, SAMPLE_TEXT, wav)
    encode_m4a(ffmpeg, wav, out_dir / f'{name}.m4a')
    wav.unlink()
    print('만듦:', out_dir / f'{name}.m4a')


if __name__ == '__main__':
  main()
