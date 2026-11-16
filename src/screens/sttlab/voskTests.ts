import type { Model } from 'vosk-browser';
import { contentUrl } from '../../content/loader';
import type { Sentence } from '../../content/types';
import { wordMatchJudge } from '../../scoring/wordMatchJudge';
import { playAudio } from '../../speech/audioPlayer';
import { openMicStream, type MicStream } from '../../speech/micStream';
import { createCaptureContext } from '../../speech/pcmCapture';
import { createVoskSession, grammarFor } from '../../speech/voskEngine';

// 시험 B: 앱 안 인식 엔진(Vosk)이 아이폰에서 도는지, 얼마나 빠르고 정확한지 본다.

type Log = (m: string) => void;
type Heard = { text: string; totalMs: number; lagMs: number };

// 아무 말도 없으면 이 시간 뒤에 그때까지 들은 것으로 끝낸다
const SILENCE_LIMIT_MS = 12000;
const FLUSH_GRACE_MS = 2000;

// 한 문장을 듣는다. 말이 끊겨 확정 결과가 오면 끝난다 (엔진이 침묵을 스스로 알아챈다)
function hearOnce(model: Model, mic: MicStream, grammar: string[] | null, log: Log): Promise<Heard> {
  return new Promise((resolve) => {
    const began = performance.now();
    let lastPartial = '';
    let lastPartialAt = began;
    let flushed = false;
    let done = false;
    const timers: number[] = [];
    const finish = (text: string) => {
      if (done) return;
      done = true;
      timers.forEach((t) => window.clearTimeout(t));
      unsubscribe();
      session.close();
      const now = performance.now();
      resolve({ text, totalMs: Math.round(now - began), lagMs: Math.round(now - lastPartialAt) });
    };
    const session = createVoskSession(model, mic.sampleRate, grammar, {
      onPartial: (t) => {
        if (!t || t === lastPartial) return;
        lastPartial = t;
        lastPartialAt = performance.now();
        log(`중간: "${t}"`);
      },
      // 말하기 전의 침묵에도 빈 확정 결과가 온다. 그건 건너뛴다
      onFinal: (t) => { if (t || flushed) finish(t); },
      onError: (m) => { log(`엔진 오류: ${m}`); finish(lastPartial); }
    });
    const unsubscribe = mic.subscribe(session.feed);
    timers.push(window.setTimeout(() => {
      flushed = true;
      session.flush();
      timers.push(window.setTimeout(() => finish(lastPartial), FLUSH_GRACE_MS));
    }, SILENCE_LIMIT_MS));
  });
}

function report(s: Sentence, r: Heard, mic: MicStream, log: Log): void {
  const pct = Math.round(wordMatchJudge.judge(s.en, [r.text]).ratio * 100);
  log(`결과: "${r.text}" · 일치율 ${pct}% · 전체 ${r.totalMs}ms · 마지막 중간 결과→확정 ${r.lagMs}ms · 최대 소리 ${mic.takePeak().toFixed(3)}`);
}

const modeText = (useGrammar: boolean) => (useGrammar ? '문장 단어만 허용' : '자유 인식');

// B1: 문장 하나 말하기. 반드시 탭 처리 함수 안에서 await 없이 부른다
export async function runSpeakTest(model: Model, s: Sentence, useGrammar: boolean, log: Log): Promise<void> {
  const ctx = createCaptureContext();
  if (!ctx) return log('이 환경에는 Web Audio가 없음');
  try {
    const mic = await openMicStream(ctx, log);
    log(`듣기 시작 (${modeText(useGrammar)}) — 목표 "${s.en}"`);
    report(s, await hearOnce(model, mic, useGrammar ? grammarFor(s.en) : null, log), mic, log);
    mic.close();
  } catch (e) {
    log(`오류: ${String(e)}`);
  } finally {
    ctx.close().catch(() => undefined);
  }
}

// B2: 손 안 대고 이어 말하기 미리 보기. 마이크를 한 번 열어 둔 채로
// 튜터가 읽음 → 내가 말함 → 다음 문장을 반복한다. 튜터 소리가 나는 동안에는 엔진에 소리를 주지 않는다
export async function runContinuousTest(model: Model, list: Sentence[], useGrammar: boolean, log: Log): Promise<void> {
  const ctx = createCaptureContext();
  if (!ctx) return log('이 환경에는 Web Audio가 없음');
  try {
    const mic = await openMicStream(ctx, log);
    log(`이어 말하기 시작 (${modeText(useGrammar)}) · ${mic.info()}`);
    for (const s of list) {
      if (s.audio) await playAudio(contentUrl(s.audio));
      log(`튜터 음성 끝 (그동안 마이크 최대 소리 ${mic.takePeak().toFixed(3)}) → 듣기 — 목표 "${s.en}"`);
      report(s, await hearOnce(model, mic, useGrammar ? grammarFor(s.en) : null, log), mic, log);
    }
    mic.close();
    log('이어 말하기 끝');
  } catch (e) {
    log(`오류: ${String(e)}`);
  } finally {
    ctx.close().catch(() => undefined);
  }
}
