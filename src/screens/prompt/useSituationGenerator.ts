import { useState } from 'react';
import { callGemini, GeminiError } from '../../gemini/geminiClient';
import { parseSituation, situationRequest, type GeneratedSituation } from '../../gemini/tasks';
import { useGeminiKey } from '../../gemini/useGeminiKey';

type Generator = {
  // 키가 없으면 false — 버튼 자체를 그리지 않는다 (키 없이도 화면의 기본 기능은 그대로 동작해야 해서)
  available: boolean;
  busy: boolean;
  error: string | null;
  generate: (sentences: string[]) => Promise<void>;
};

// 고른 문장으로 상황·상대·나를 Gemini에게 받아 onResult로 넘긴다. 프롬프트 본문은 계속 템플릿으로 만든다
export function useSituationGenerator(onResult: (s: GeneratedSituation) => void): Generator {
  const key = useGeminiKey();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (sentences: string[]) => {
    setBusy(true);
    setError(null);
    try {
      onResult(parseSituation(await callGemini(key, situationRequest(sentences))));
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : '만들지 못했어요. 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  return { available: key !== '', busy, error, generate };
}
