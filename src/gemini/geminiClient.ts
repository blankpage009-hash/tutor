// Gemini 호출(브라우저에서 fetch로 직접). 새 라이브러리 없이 REST만 쓴다.
// 모델 이름은 여기 한 곳에만 둔다: 구글이 모델을 바꾸면 이 상수만 고치면 된다 (2026-11 문서의 무료 등급 안정 모델).
// gemini-3.8-flash는 기본으로 "생각"을 하느라 30초 안에 답이 안 와 시간 초과가 났다(2026-11-19 아이폰).
// flash-lite는 생각이 거의 꺼진 채가 기본이라 빠르다. 이 앱의 일(문장 몇 개, 짧은 대본)은 lite로 충분하다
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 60_000;

// 화면에 그대로 보여 줘도 되는 한국어 메시지를 담는다
export class GeminiError extends Error {}

export type GeminiRequest = { prompt: string; json?: boolean; temperature?: number };

export function statusMessage(status: number): string {
  if (status === 400 || status === 401 || status === 403) return '키가 맞지 않아요. 설정에서 Gemini 키를 확인해 주세요.';
  if (status === 404) return '구글이 이 모델을 더 이상 제공하지 않는 것 같아요. 앱을 업데이트해야 해요.';
  if (status === 429) return '무료 사용량을 다 썼어요. 잠시 뒤에 다시 해 주세요.';
  if (status >= 500) return '구글 서버가 바쁜 것 같아요. 잠시 뒤에 다시 해 주세요.';
  return `생성하지 못했어요 (오류 ${status})`;
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
};

function extractText(data: GeminiResponse): string {
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? '';
  if (text) return text;
  throw new GeminiError(data.promptFeedback?.blockReason
    ? '구글 안전 필터에 걸려 결과가 없어요. 내용을 바꿔서 다시 해 주세요.'
    : '결과가 비어 있어요. 다시 해 주세요.');
}

async function send(key: string, req: GeminiRequest, signal: AbortSignal): Promise<Response> {
  try {
    // 키는 주소(?key=)가 아니라 헤더로 보낸다: 주소는 기록·로그에 남기 쉽다
    return await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        generationConfig: {
          temperature: req.temperature ?? 0.8,
          ...(req.json ? { responseMimeType: 'application/json' } : {})
        }
      })
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new GeminiError('시간이 너무 오래 걸려서 멈췄어요. 다시 해 주세요.');
    throw new GeminiError('인터넷에 연결되어 있는지 확인해 주세요.');
  }
}

export async function callGemini(key: string, req: GeminiRequest): Promise<string> {
  if (!key.trim()) throw new GeminiError('설정에서 Gemini 키를 먼저 넣어 주세요.');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await send(key.trim(), req, ctl.signal);
    if (!res.ok) throw new GeminiError(statusMessage(res.status));
    return extractText((await res.json()) as GeminiResponse);
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError('응답을 읽지 못했어요. 다시 해 주세요.');
  } finally {
    clearTimeout(timer);
  }
}
