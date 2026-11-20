import type { Model } from 'vosk-browser';
import { normalizeText, sameWord } from '../src/scoring/normalize';
import { grammarFor, looseGrammarFor, recognizeChunks } from '../src/speech/voskEngine';
import { downsample, mergeChunks, WAV_RATE } from '../src/speech/wav';

// PC 시험 전용(엔진 묶음): 같은 녹음을 엔진마다 넣어 "적힌 글자"를 나란히 비교한다 (사용자 요청 2026-11-21).
// 앱 코드는 바꾸지 않고, 앱이 쓰는 모듈(마이크·Vosk 인식)을 그대로 가져다 써서 조건을 맞춘다.

export type Recording = { chunks: Float32Array[]; rate: number };
export type Engine = { name: string; load(): Promise<void>; run(r: Recording, sentence: string): Promise<string> };

const BASE = import.meta.env.BASE_URL;
const SMALL_VOSK = `${location.origin}${BASE}models/vosk-model-small-en-us-0.15.tar.gz`;
// 128MB라 저장소에 안 올린다 (lab/models/는 .gitignore). PC에서 받아 다시 묶어 둔 것
const BIG_VOSK = `${location.origin}${BASE}lab/models/vosk-model-en-us-0.22-lgraph.tar.gz`;
const VOSK_TIMEOUT_MS = 30000;

export const PRESETS = [
  "I'm torn between the pasta and the burger.",
  'Afternoons work best for me.',
  "If I were you, I'd get the apple pie.",
  'Maybe we should try the one near the library.'
];

async function loadVosk(url: string): Promise<Model> {
  const m = await import('vosk-browser');
  // 라이브러리가 옛 방식(UMD)이라 default 아래에 들어오기도 한다 (voskEngine.ts와 같은 이유)
  type VoskModule = { createModel(url: string): Promise<Model> };
  const vosk = ((m as unknown as { default?: VoskModule }).default ?? m) as VoskModule;
  return vosk.createModel(url);
}

function voskEngines(label: string, url: string): Engine[] {
  let model: Promise<Model> | null = null;
  const get = () => (model ??= loadVosk(url));
  const run = async (r: Recording, grammar: string[] | null) =>
    (await recognizeChunks(await get(), r.rate, grammar, r.chunks, VOSK_TIMEOUT_MS)) ?? '(시간 초과)';
  return [
    { name: `${label} 자유`, load: async () => { await get(); }, run: (r) => run(r, null) },
    // 지금 앱의 롤플레이 두 번째 의견과 같은 목록
    { name: `${label} + 정답 단어`, load: async () => { await get(); }, run: (r, s) => run(r, looseGrammarFor(s)) },
    { name: `${label} + 문장 통째`, load: async () => { await get(); }, run: (r, s) => run(r, grammarFor(s)) }
  ];
}

type Asr = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>;

function whisperEngine(label: string, repo: string): Engine {
  let asr: Promise<Asr> | null = null;
  const get = () => (asr ??= import('@huggingface/transformers').then(
    ({ pipeline }) => pipeline('automatic-speech-recognition', repo, { dtype: 'q8', device: 'wasm' }) as unknown as Promise<Asr>
  ));
  return {
    name: label,
    load: async () => { await get(); },
    run: async (r) => {
      // Whisper는 16kHz 소리만 받는다
      const out = await (await get())(downsample(mergeChunks(r.chunks), r.rate, WAV_RATE));
      return (Array.isArray(out) ? out[0]?.text : out.text)?.trim() ?? '';
    }
  };
}

export const ENGINES: Engine[] = [
  ...voskEngines('작은 Vosk(지금 앱)', SMALL_VOSK),
  ...voskEngines('큰 Vosk(128MB)', BIG_VOSK),
  whisperEngine('Whisper tiny.en', 'onnx-community/whisper-tiny.en'),
  whisperEngine('Whisper base.en', 'onnx-community/whisper-base.en')
];

// 예시 문장 단어 중 몇 개가 적혔나 (같은 단어 두 번 세지 않게 한 번 쓴 단어는 지운다)
export function countMatched(sentence: string, heard: string): { matched: number; total: number } {
  const want = normalizeText(sentence);
  const left = [...want];
  for (const w of normalizeText(heard)) {
    const i = left.findIndex((e) => sameWord(e, w));
    if (i >= 0) left.splice(i, 1);
  }
  return { matched: want.length - left.length, total: want.length };
}

