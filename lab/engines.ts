import type { Model } from 'vosk-browser';
import { normalizeText, sameWord } from '../src/scoring/normalize';
import { looseGrammarFor, recognizeChunks } from '../src/speech/voskEngine';
import { downsample, mergeChunks, WAV_RATE } from '../src/speech/wav';

// PC 시험 전용(엔진 묶음): 같은 녹음을 엔진마다 넣어 "적힌 글자"를 나란히 비교한다 (사용자 요청 2026-11-21).
// 앱 코드는 바꾸지 않고, 앱이 쓰는 모듈(마이크·Vosk 인식)을 그대로 가져다 써서 조건을 맞춘다.

export type Recording = { chunks: Float32Array[]; rate: number };
export type Engine = { name: string; on?: boolean; load(): Promise<void>; run(r: Recording, sentence: string): Promise<string> };

const BASE = import.meta.env.BASE_URL;
const SMALL_VOSK = `${location.origin}${BASE}models/vosk-model-small-en-us-0.15.tar.gz`;
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
    { name: `${label} 자유`, on: true, load: async () => { await get(); }, run: (r) => run(r, null) },
    // 지금 앱의 롤플레이 두 번째 의견과 같은 목록
    { name: `${label} + 정답 단어`, load: async () => { await get(); }, run: (r, s) => run(r, looseGrammarFor(s)) }
  ];
}

type Asr = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>;

// gpu: 그래픽 칩(WebGPU)으로 계산. 아이폰 Safari가 지원하면 CPU(wasm)보다 훨씬 빠를 수 있어 따로 잰다.
// WebGPU에서는 q8이 잘 안 돼 라이브러리 예제가 권하는 조합(encoder fp32 + decoder q4)을 쓴다
function whisperEngine(label: string, repo: string, gpu = false, on = false): Engine {
  let asr: Promise<Asr> | null = null;
  const options = gpu
    ? { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } }
    : { device: 'wasm', dtype: 'q8' };
  const get = () => (asr ??= import('@huggingface/transformers').then(({ pipeline }) => {
    if (gpu && !('gpu' in navigator)) throw new Error('이 브라우저는 WebGPU 지원 안 함');
    return pipeline('automatic-speech-recognition', repo, options as never) as unknown as Promise<Asr>;
  }));
  return {
    name: label,
    on,
    load: async () => { await get(); },
    run: async (r) => {
      // Whisper는 16kHz 소리만 받는다
      const out = await (await get())(downsample(mergeChunks(r.chunks), r.rate, WAV_RATE));
      return (Array.isArray(out) ? out[0]?.text : out.text)?.trim() ?? '';
    }
  };
}

export const ENGINES: Engine[] = [
  // 큰 Vosk(lgraph 128MB)·문장 통째 칸은 1차 비교(2026-11-21)에서 뺐다: 큰 Vosk는 6~8배 느리고
  // 사용자 발음은 오히려 덜 맞혔다(36/49 vs 작은 것 40/49). 문장 통째는 쉐도잉용이라 롤플레이 비교와 무관
  // on: 처음부터 체크된 칸. 아이폰은 메모리가 작아 한꺼번에 다 올리면 꺼질 수 있어 기본은 둘만 (2026-11-21)
  ...voskEngines('작은 Vosk(지금 앱)', SMALL_VOSK),
  whisperEngine('Whisper tiny.en', 'onnx-community/whisper-tiny.en'),
  whisperEngine('Whisper base.en', 'onnx-community/whisper-base.en', false, true),
  whisperEngine('Whisper base.en (WebGPU)', 'onnx-community/whisper-base.en', true)
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

