import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { copyText } from './copyText';
import styles from './Prompt.module.css';

type Copy = 'idle' | 'ok' | 'fail';

// 만들어진 프롬프트를 보여 주고 복사한다. 복사가 막히면 글자를 길게 눌러 직접 복사하도록 안내한다
export function PromptPreview({ text }: { text: string }) {
  const [copy, setCopy] = useState<Copy>('idle');
  // 내용을 고치면 이전 '복사됨' 표시가 거짓이 되므로 지운다
  useEffect(() => setCopy('idle'), [text]);
  const onCopy = async () => setCopy((await copyText(text)) ? 'ok' : 'fail');
  return (
    <div className={styles.section}>
      <label className={styles.field}>
        <span className={styles.label} lang="ko">만들어진 프롬프트</span>
        <textarea className={`${styles.textarea} ${styles.preview}`} readOnly value={text} />
      </label>
      <div style={{ marginTop: 'var(--space-3)' }}>
        <Button variant="primary" block onClick={onCopy}>프롬프트 복사</Button>
      </div>
      {copy === 'ok' && <p className={styles.copied} lang="ko">복사했어요. Gemini나 ChatGPT 음성모드 대화창에 붙여넣으세요.</p>}
      {copy === 'fail' && <p className={styles.failed} lang="ko">복사하지 못했어요. 위 글자를 길게 눌러 직접 복사해 주세요.</p>}
    </div>
  );
}
