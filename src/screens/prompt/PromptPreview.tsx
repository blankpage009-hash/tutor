import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { callGemini, GeminiError } from '../../gemini/geminiClient';
import { parsePolished, polishRequest } from '../../gemini/tasks';
import { useGeminiKey } from '../../gemini/useGeminiKey';
import { copyText } from './copyText';
import styles from './Prompt.module.css';

type Copy = 'idle' | 'ok' | 'fail';
// 다듬은 글이 어느 템플릿에서 나왔는지 같이 적어 둔다: 폼을 고치면 템플릿이 달라져 다듬은 글은 낡은 것이 된다
type Polished = { from: string; text: string };

// 만들어진 프롬프트를 보여 주고 복사한다. 복사가 막히면 글자를 길게 눌러 직접 복사하도록 안내한다
export function PromptPreview({ text: template }: { text: string }) {
  const [copy, setCopy] = useState<Copy>('idle');
  const [polished, setPolished] = useState<Polished | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useGeminiKey();
  const text = polished && polished.from === template ? polished.text : template;
  // 내용이 바뀌면 이전 '복사됨' 표시가 거짓이 되므로 지운다
  useEffect(() => setCopy('idle'), [text]);

  const polish = async () => {
    setBusy(true);
    setError(null);
    try {
      setPolished({ from: template, text: parsePolished(await callGemini(key, polishRequest(template))) });
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : '다듬지 못했어요. 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  const onCopy = async () => setCopy((await copyText(text)) ? 'ok' : 'fail');
  const isPolished = text !== template;
  return (
    <div className={styles.section}>
      <label className={styles.field}>
        <span className={styles.label} lang="ko">만들어진 프롬프트{isPolished ? ' (Gemini가 다듬음)' : ''}</span>
        <textarea className={`${styles.textarea} ${styles.preview}`} readOnly value={text} />
      </label>
      <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-2)' }}>
        <Button variant="primary" block onClick={onCopy}>프롬프트 복사</Button>
        {key && <Button block disabled={busy} onClick={polish}>{busy ? '다듬는 중…' : 'Gemini로 다듬기'}</Button>}
        {isPolished && <Button variant="ghost" block onClick={() => setPolished(null)}>원래 글로 되돌리기</Button>}
      </div>
      {copy === 'ok' && <p className={styles.copied} lang="ko">복사했어요. Gemini나 ChatGPT 음성모드 대화창에 붙여넣으세요.</p>}
      {copy === 'fail' && <p className={styles.failed} lang="ko">복사하지 못했어요. 위 글자를 길게 눌러 직접 복사해 주세요.</p>}
      {error && <p className={styles.failed} lang="ko">{error}</p>}
    </div>
  );
}
