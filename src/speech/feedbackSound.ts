import { playSource } from './audioPlayer';
import { encodeWav } from './wav';

// 통과·실패·단계 완료 효과음 (사용자 요청 2026-11-19).
// 소리 파일을 따로 받지 않고 여기서 음을 만들어 WAV로 바꾼 뒤, 튜터 음성과 같은 재생기(<audio>)로 튼다.
// iOS에서 탭 없이 코드로 소리를 낼 수 있는 길이 이 재생기뿐이라서다 (audioPlayer.ts 참고).
// 주의: 마이크가 켜진 채 틀면 iOS가 통화 모드가 되어 잡음이 섞인다 — 부르는 쪽이 마이크를 먼저 닫는다

export type FeedbackKind = 'pass' | 'fail' | 'complete';

// 효과음이라 음질보다 크기가 중요하다. 22kHz면 높은 음(약 1kHz)도 충분히 깨끗하다
const RATE = 22050;
// 튜터 음성보다 튀지 않게 최대 크기를 절반 정도로
const PEAK = 0.5;

type Note = { freq: number; at: number; len: number }; // 시작·길이는 초

const NOTES: Record<FeedbackKind, Note[]> = {
  // 밝게 올라가는 두 음 (솔 → 도)
  pass: [{ freq: 784, at: 0, len: 0.3 }, { freq: 1047, at: 0.1, len: 0.35 }],
  // 내려가는 부드러운 두 음 (미 → 도), 통과보다 낮게. 거친 버저 소리는 피한다.
  // 더 낮추면(300Hz 안팎) 아이폰 스피커에서 잘 안 들려서 이 높이로 둔다
  fail: [{ freq: 659, at: 0, len: 0.25 }, { freq: 523, at: 0.15, len: 0.3 }],
  // 도-미-솔-도 짧은 팡파르
  complete: [
    { freq: 523, at: 0, len: 0.3 }, { freq: 659, at: 0.12, len: 0.3 },
    { freq: 784, at: 0.24, len: 0.3 }, { freq: 1047, at: 0.36, len: 0.7 }
  ]
};

// 종소리처럼: 아주 짧게 올라갔다가 서서히 사라진다. 배음을 조금 섞어 '삐' 같은 맨 사인파보다 둥글게
function addNote(out: Float32Array, n: Note): void {
  const start = Math.round(n.at * RATE);
  const count = Math.round(n.len * RATE);
  const attack = Math.round(0.005 * RATE);
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, i / attack) * Math.exp(-5 * t / n.len);
    const w = 2 * Math.PI * n.freq * t;
    out[start + i] += env * (Math.sin(w) + 0.25 * Math.sin(2 * w) + 0.1 * Math.sin(3 * w));
  }
}

// 음을 겹쳐 그리고 최대 크기를 PEAK로 맞춘다 (시험용으로 내보냄)
export function renderFeedback(kind: FeedbackKind): Float32Array {
  const notes = NOTES[kind];
  const end = Math.max(...notes.map((n) => n.at + n.len));
  const out = new Float32Array(Math.ceil(end * RATE));
  notes.forEach((n) => addNote(out, n));
  const max = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] / max) * PEAK;
  return out;
}

export function feedbackSeconds(kind: FeedbackKind): number {
  return renderFeedback(kind).length / RATE;
}

const urls: Partial<Record<FeedbackKind, string>> = {};

function feedbackUrl(kind: FeedbackKind): string {
  urls[kind] ??= URL.createObjectURL(new Blob([encodeWav(renderFeedback(kind), RATE)], { type: 'audio/wav' }));
  return urls[kind];
}

// 소리가 끝나면(실패해도) 끝나는 약속. 드릴·롤플레이 순서가 이걸 기다리므로, iOS가 끝 신호를
// 안 주는 경우에도 멈춰 버리지 않게 길이 + 0.5초가 지나면 그냥 끝낸다
export function playFeedback(kind: FeedbackKind): Promise<void> {
  const limit = (feedbackSeconds(kind) + 0.5) * 1000;
  const played = playSource(feedbackUrl(kind)).catch(() => undefined);
  const timeout = new Promise<void>((r) => window.setTimeout(r, limit));
  return Promise.race([played, timeout]);
}
