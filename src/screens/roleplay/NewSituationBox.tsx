import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { callGemini, GeminiError } from '../../gemini/geminiClient';
import { parseRoleplay, roleplayRequest } from '../../gemini/tasks';
import { useGeminiKey } from '../../gemini/useGeminiKey';
import courseStyles from '../courses/Courses.module.css';
import promptStyles from '../prompt/Prompt.module.css';
import { getCustomRolePlay, setCustomRolePlay } from './customStore';

// Gemini 키가 있을 때만 나타나는 "새 상황 만들기". 만든 대사는 음성이 없어 글자로만 나온다 (PLAN 5.8)
export function NewSituationBox() {
  const key = useGeminiKey();
  const nav = useNavigate();
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!key) return null;
  const last = getCustomRolePlay();

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      setCustomRolePlay(parseRoleplay(await callGemini(key, roleplayRequest(hint))));
      nav('/roleplay/custom');
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : '만들지 못했어요. 다시 해 주세요.');
      setBusy(false);
    }
  };
  return (
    <section className={promptStyles.section}>
      <label className={promptStyles.field}>
        <span className={promptStyles.label} lang="ko">새 상황 만들기 (Gemini)</span>
        <input className={promptStyles.input} type="text" value={hint} placeholder="예: 공항에서 짐 부치기 (비워도 돼요)"
          onChange={(e) => setHint(e.target.value)} />
      </label>
      <p className={promptStyles.hint} lang="ko">상대 대사는 소리 없이 글자로만 나와요. 만든 상황은 앱을 닫으면 사라져요.</p>
      <div className={courseStyles.actions}>
        <Button variant="primary" block disabled={busy} onClick={make}>{busy ? '만드는 중…' : '새 상황 만들기'}</Button>
        {last && <Button block onClick={() => nav('/roleplay/custom')}>방금 만든 상황 다시 하기: {last.title}</Button>}
      </div>
      {error && <p className={promptStyles.failed} lang="ko">{error}</p>}
    </section>
  );
}
