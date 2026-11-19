import { useState } from 'react';
import { Button } from '../../components/Button';
import { callGemini, GeminiError } from '../../gemini/geminiClient';
import { parseVariations, variationRequest, type Variation } from '../../gemini/tasks';
import styles from './Library.module.css';

type Props = { geminiKey: string; en: string; ko?: string };

// 저장 문장 한 줄 아래의 "변형 더 만들기"(Gemini 키가 있을 때만 그려진다). 만든 문장은 글자로만 보여 준다
export function VariationBox({ geminiKey, en, ko }: Props) {
  const [items, setItems] = useState<Variation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      setItems(parseVariations(await callGemini(geminiKey, variationRequest(en, ko))));
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : '만들지 못했어요. 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className={styles.actions}>
        <Button size="sm" disabled={busy} onClick={make}>{busy ? '만드는 중…' : items ? '다시 만들기' : '변형 더 만들기'}</Button>
      </div>
      {error && <p className={styles.confirm} lang="ko">{error}</p>}
      {items && (
        <ul className={styles.confirm}>
          {items.map((v) => (
            <li key={v.en} style={{ marginBottom: 'var(--space-2)' }}>
              <span lang="en">{v.en}</span>
              {v.ko && <span lang="ko" style={{ display: 'block', color: 'var(--ink-muted)' }}>{v.ko}</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
