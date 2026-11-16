import type { KaldiRecognizer, Model } from 'vosk-browser';

// 앱 안에서 도는 음성 인식 엔진(Vosk, WebAssembly). 목소리는 기기 밖으로 나가지 않고 인터넷도 필요 없다.
// 엔진 코드(약 6MB)는 이 기능을 처음 쓸 때 불러온다. 모델(약 40MB)은 라이브러리가 처음 한 번 내려받아
// 기기(IndexedDB)에 풀어 두고 다음부터는 그것을 쓴다.

const MODEL_FILE = 'models/vosk-model-small-en-us-0.15.tar.gz';

type VoskModule = { createModel(url: string, logLevel?: number): Promise<Model> };

let loading: Promise<Model> | null = null;

export function loadVoskModel(): Promise<Model> {
  loading ??= import('vosk-browser')
    .then((m) => {
      // 라이브러리가 옛 방식(UMD)이라 묶는 도구에 따라 default 아래에 들어오기도 한다
      const vosk = ((m as { default?: VoskModule }).default ?? m) as VoskModule;
      // 엔진은 별도 작업 스레드에서 돌아서 주소를 전체 주소로 줘야 한다
      return vosk.createModel(`${location.origin}${import.meta.env.BASE_URL}${MODEL_FILE}`);
    })
    .catch((e) => {
      loading = null; // 실패하면 다음에 다시 시도할 수 있게
      throw e;
    });
  return loading;
}

// "지금 말해야 할 문장"의 단어만 알아듣게 하는 목록. 그 밖의 말은 [unk](모르는 말)로 나온다.
// 엔진 사전은 소문자 낱말만 알아서 문장부호를 뺀다
export function grammarFor(sentenceEn: string): string[] {
  const text = sentenceEn
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return [text, '[unk]'];
}

export type VoskHandlers = {
  onPartial?: (text: string) => void; // 말하는 중간 결과
  onFinal?: (text: string) => void; // 말이 끊겼을 때의 확정 결과 (빈 글자일 수 있음)
  onError?: (msg: string) => void;
};

export type VoskSession = {
  feed(data: Float32Array): void;
  // 지금까지 들은 것으로 확정 결과를 달라고 한다 (onFinal로 온다)
  flush(): void;
  close(): void;
};

// 이미 모아 둔 소리를 새 인식기에 한 번에 넣고, 들린 말 전체를 돌려준다 (두 번째 의견용).
// 넣는 도중 엔진이 쉼에서 끊어 확정 결과가 여러 번 올 수 있어 빈 것 빼고 이어 붙인다.
// 마지막 확정 결과가 언제 오는지 알려 주는 신호가 없어서, 마지막으로 확정 결과를 달라고 한 뒤
// 결과가 하나 오고 잠깐(QUIET_MS) 아무 소식이 없으면 끝난 것으로 본다
const QUIET_MS = 250;

export function recognizeChunks(
  model: Model, sampleRate: number, grammar: string[] | null, chunks: Float32Array[], timeoutMs: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const parts: string[] = [];
    let asked = false;
    let gotFinal = false;
    let quiet = 0;
    const done = (text: string | null) => {
      window.clearTimeout(quiet);
      window.clearTimeout(limit);
      session.close();
      resolve(text);
    };
    const bump = () => {
      window.clearTimeout(quiet);
      if (gotFinal) quiet = window.setTimeout(() => done(parts.join(' ')), QUIET_MS);
    };
    const session = createVoskSession(model, sampleRate, grammar, {
      onPartial: bump,
      onFinal: (t) => {
        if (t) parts.push(t);
        if (asked) gotFinal = true;
        bump();
      },
      onError: () => done(null)
    });
    const limit = window.setTimeout(() => done(parts.length ? parts.join(' ') : null), timeoutMs);
    chunks.forEach((c) => session.feed(c));
    asked = true;
    session.flush();
  });
}

export function createVoskSession(
  model: Model, sampleRate: number, grammar: string[] | null, h: VoskHandlers
): VoskSession {
  const rec: KaldiRecognizer = grammar
    ? new model.KaldiRecognizer(sampleRate, JSON.stringify(grammar))
    : new model.KaldiRecognizer(sampleRate);
  rec.on('partialresult', (m) => {
    if (m.event === 'partialresult') h.onPartial?.(m.result.partial);
  });
  rec.on('result', (m) => {
    if (m.event === 'result') h.onFinal?.(m.result.text);
  });
  rec.on('error', (m) => {
    if (m.event === 'error') h.onError?.(m.error);
  });
  return {
    // 라이브러리가 조각을 작업 스레드로 넘기며 가져가 버릴 수 있어 복사본을 준다
    feed: (data) => rec.acceptWaveformFloat(new Float32Array(data), sampleRate),
    flush: () => rec.retrieveFinalResult(),
    close: () => rec.remove()
  };
}
