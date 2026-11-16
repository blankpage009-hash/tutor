import { playAudio } from '../../speech/audioPlayer';
import { openMicStream } from '../../speech/micStream';
import { createCaptureContext } from '../../speech/pcmCapture';

// 시험 A: 아이폰 내장 음성 인식을 전혀 쓰지 않을 때, 앱이 마이크 소리를 연속으로 잘 받는지 본다.
// (내장 인식과 섞어 쓴 시험에서는 두 번째부터 최대 소리 0.000이었다 — 아이폰 결과 6~8차)

type Log = (m: string) => void;

const ROUNDS = 5;
const ROUND_MS = 3000;
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const level = (p: number) => `최대 소리 ${p.toFixed(3)}${p < 0.005 ? ' ← 무음!' : ''}`;

// 반드시 탭 처리 함수 안에서 await 없이 부른다 (녹음 장치를 탭 순간에 만들어야 iOS가 소리를 준다)
function captureContext(log: Log): AudioContext | null {
  const ctx = createCaptureContext();
  if (!ctx) log('이 환경에는 Web Audio가 없음');
  return ctx;
}

// A1·A2: 마이크를 열었다 닫기를 5번. tutorUrl을 주면 사이사이에 튜터 음성을 재생한다
export async function runReopenTest(log: Log, tutorUrl: string | null): Promise<void> {
  const ctx = captureContext(log);
  if (!ctx) return;
  try {
    for (let i = 1; i <= ROUNDS; i++) {
      const mic = await openMicStream(ctx, log);
      await wait(ROUND_MS);
      log(`${i}번째: ${level(mic.takePeak())} · ${mic.info()}`);
      mic.close();
      if (tutorUrl && i < ROUNDS) {
        await playAudio(tutorUrl);
        log('튜터 음성 재생 끝');
      } else {
        await wait(500);
      }
    }
  } catch (e) {
    log(`오류: ${String(e)}`);
  } finally {
    ctx.close().catch(() => undefined);
  }
}

// A3: 마이크를 한 번 열고 15초 동안 계속 켜 둔다. 중간(6~9초)에 튜터 음성을 재생해
// 켜 둔 채로도 소리가 계속 들어오는지, 튜터 소리가 작아지는지(귀로 확인) 본다
export async function runKeepOpenTest(log: Log, tutorUrl: string): Promise<void> {
  const ctx = captureContext(log);
  if (!ctx) return;
  try {
    const mic = await openMicStream(ctx, log);
    for (let i = 1; i <= ROUNDS; i++) {
      const playing = i === 3;
      if (playing) playAudio(tutorUrl).catch((e) => log(`재생 실패: ${String(e)}`));
      await wait(ROUND_MS);
      log(`${i * 3}초: ${level(mic.takePeak())}${playing ? ' (튜터 음성 재생 구간)' : ''} · ${mic.info()}`);
    }
    mic.close();
  } catch (e) {
    log(`오류: ${String(e)}`);
  } finally {
    ctx.close().catch(() => undefined);
  }
}
