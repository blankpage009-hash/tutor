import { afterEach, describe, expect, it, vi } from 'vitest';
import { callGemini, GeminiError, statusMessage } from './geminiClient';

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

describe('callGemini', () => {
  it('키는 헤더로만 보내고 주소에는 넣지 않는다', async () => {
    const f = stubFetch(async () => ok({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] }));
    expect(await callGemini(' SECRET ', { prompt: 'hi' })).toBe('hello');
    const [url, init] = f.mock.calls[0];
    expect(url).not.toContain('SECRET');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('SECRET');
  });

  it('json 요청이면 JSON 응답 형식을 요구한다', async () => {
    const f = stubFetch(async () => ok({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }));
    await callGemini('k', { prompt: 'p', json: true });
    expect(JSON.parse(f.mock.calls[0][1].body as string).generationConfig.responseMimeType).toBe('application/json');
  });

  it('키가 비어 있으면 호출하지 않는다', async () => {
    const f = stubFetch(async () => ok({}));
    await expect(callGemini('  ', { prompt: 'p' })).rejects.toBeInstanceOf(GeminiError);
    expect(f).not.toHaveBeenCalled();
  });

  it('오류 코드를 한국어 메시지로 바꾼다', async () => {
    stubFetch(async () => new Response('{}', { status: 429 }));
    await expect(callGemini('k', { prompt: 'p' })).rejects.toThrow(statusMessage(429));
    expect(statusMessage(403)).toContain('키');
  });

  it('인터넷이 끊기면 연결 안내를 준다', async () => {
    stubFetch(async () => { throw new TypeError('Failed to fetch'); });
    await expect(callGemini('k', { prompt: 'p' })).rejects.toThrow('인터넷');
  });

  it('결과가 비었거나 막혔으면 이유를 알려 준다', async () => {
    stubFetch(async () => ok({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(callGemini('k', { prompt: 'p' })).rejects.toThrow('안전 필터');
    stubFetch(async () => ok({ candidates: [] }));
    await expect(callGemini('k', { prompt: 'p' })).rejects.toThrow('비어');
  });

  it('응답이 JSON이 아니어도 앱이 죽지 않고 한국어 오류가 된다', async () => {
    stubFetch(async () => new Response('<html>', { status: 200 }));
    await expect(callGemini('k', { prompt: 'p' })).rejects.toBeInstanceOf(GeminiError);
  });
});
