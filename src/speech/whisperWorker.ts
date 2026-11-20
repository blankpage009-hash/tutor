import { env, pipeline } from '@huggingface/transformers';
import ortMjs from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import type { WhisperReply, WhisperRequest } from './whisperEngine';

// Whisper(앱 안 받아쓰기)를 화면과 다른 작업 스레드에서 돌린다.
// GitHub Pages 주소에서는 계산이 한 줄로만 돌아서(여러 줄 계산에 필요한 서버 설정을 못 함),
// 화면 쪽에서 돌리면 받아쓰는 약 2.3초 동안 화면이 멈춘다 (아이폰 시험 2026-11-21).

const MODEL = 'whisper-base.en';

// 모델·계산 프로그램을 외부 사이트(huggingface.co, jsdelivr)가 아니라 우리 배포 주소에서 받는다.
// 사이트 사정에 흔들리지 않고, 요청이 밖으로 나가지 않게 (Vosk 모델과 같은 방식)
function useOwnFiles(): void {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  // http://로 시작하는 전체 주소를 주면 라이브러리가 "우리 파일"로 안 보고 파일 확인을 건너뛰어 설정을 못 읽는다.
  // 그래서 /tutor/models/처럼 사이트 안 경로로 준다
  env.localModelPath = `${import.meta.env.BASE_URL}models/`;
  const wasm = env.backends.onnx.wasm;
  if (wasm) {
    wasm.wasmPaths = { mjs: new URL(ortMjs, self.location.href).href, wasm: new URL(ortWasm, self.location.href).href };
    wasm.numThreads = 1;
  }
}

type Asr = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>;
let asr: Asr | null = null;

async function load(): Promise<void> {
  useOwnFiles();
  // WebGPU는 아이폰에서 불러오다 꺼져서(2026-11-21 시험) CPU(wasm) 방식 + q8 양자화만 쓴다
  asr = (await pipeline('automatic-speech-recognition', MODEL, { device: 'wasm', dtype: 'q8' })) as unknown as Asr;
  // 첫 받아쓰기는 준비 작업 때문에 느려서, 조용한 1초로 미리 한 번 돌려 둔다
  await asr(new Float32Array(16000));
}

const textOf = (out: { text: string } | { text: string }[]) => (Array.isArray(out) ? out[0]?.text : out.text) ?? '';

self.onmessage = async (e: MessageEvent<WhisperRequest>) => {
  const msg = e.data;
  const began = performance.now();
  // 앱 설정이 화면용(DOM) 타입이라 작업 스레드의 postMessage 모양을 직접 적는다
  const reply = (r: WhisperReply) => (self as unknown as { postMessage(m: WhisperReply): void }).postMessage(r);
  try {
    if (msg.type === 'load') {
      await load();
      reply({ type: 'ready', ms: performance.now() - began });
    } else if (asr) {
      reply({ type: 'result', id: msg.id, text: textOf(await asr(msg.audio)), ms: performance.now() - began });
    } else {
      reply({ type: 'error', id: msg.id, message: '아직 준비 안 됨' });
    }
  } catch (err) {
    reply({ type: 'error', id: msg.type === 'run' ? msg.id : undefined, message: String(err) });
  }
};
