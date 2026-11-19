import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { getGeminiKey, setGeminiKey } from '../../db/settings';
import styles from './Settings.module.css';

// 키는 이 기기에만 저장한다. 입력칸에는 저장된 키를 다시 보여 주지 않고 끝 4자리만 알려 준다
function maskTail(key: string): string {
  return `저장됨 (끝 4자리 ${key.slice(-4)})`;
}

export function GeminiKeyRow() {
  const [saved, setSaved] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGeminiKey().then(setSaved, () => setError('저장된 키를 읽지 못했어요'));
  }, []);

  const save = async () => {
    try {
      await setGeminiKey(draft);
      setSaved(draft.trim());
      setDraft('');
      setError(null);
    } catch {
      setError('키를 저장하지 못했어요');
    }
  };
  const clear = async () => {
    try {
      await setGeminiKey('');
      setSaved('');
      setError(null);
    } catch {
      setError('키를 지우지 못했어요');
    }
  };

  return (
    <div className={styles.keyBlock}>
      <p className={styles.keyName} lang="ko">Gemini API 키 (선택)</p>
      <p className={styles.keyHint} lang="ko">
        키를 넣으면 변형 문장·새 롤플레잉 상황·프롬프트 다듬기 버튼이 생겨요. 키는 이 기기에만 저장되고, 생성 버튼을 누를 때만 Google로 전달돼요. 없어도 나머지 기능은 모두 써요.
      </p>
      {saved && <p className={styles.keyState} lang="ko">{maskTail(saved)}</p>}
      <input
        className={styles.input}
        type="password"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={saved ? '새 키로 바꾸려면 여기에 입력' : 'AIza… 로 시작하는 키'}
        aria-label="Gemini API 키"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className={styles.keyActions}>
        <Button variant="primary" size="sm" disabled={!draft.trim()} onClick={save}>저장</Button>
        {saved && <Button size="sm" onClick={clear}>키 지우기</Button>}
      </div>
      {error && <p className={styles.keyError} lang="ko">{error}</p>}
    </div>
  );
}
