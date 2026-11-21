import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SavedSentence } from '../db/types';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { buildPrompt } from '../prompt/buildPrompt';
import { GeneratingPopup } from './prompt/GeneratingPopup';
import { PromptFields, type Draft } from './prompt/PromptFields';
import { PromptPreview } from './prompt/PromptPreview';
import { SentencePicker } from './prompt/SentencePicker';
import { useSavedSentences } from './prompt/useSavedSentences';
import { useSituationGenerator } from './prompt/useSituationGenerator';
import styles from './prompt/Prompt.module.css';

const INITIAL: Draft = { situation: '', partnerRole: '', myRole: '', correction: 'later', feedbackLang: 'ko' };

// 보관함에서 "Role-Play Generate"로 들어오면 그 문장을 골라 두고 Generate를 한 번 대신 눌러 준다.
// 처리한 뒤 이동 기록의 state를 지워, 새로고침·뒤로 가기로 다시 들어와도 또 만들지(키 사용) 않게 한다
function useGenerateFrom(saved: SavedSentence[], select: (id: string) => void, generate: (s: string[]) => void, canGenerate: boolean) {
  const location = useLocation();
  const nav = useNavigate();
  const done = useRef(false);
  const id = (location.state as { generateFrom?: string } | null)?.generateFrom;
  useEffect(() => {
    if (!id || done.current) return;
    const row = saved.find((s) => s.id === id);
    if (!row?.en) return; // 보관함 목록을 아직 읽는 중
    done.current = true;
    select(id);
    if (canGenerate) generate([row.en]);
    nav(location.pathname, { replace: true, state: null });
  }, [id, saved, select, generate, canGenerate, nav, location.pathname]);
}

// 외부 음성모드(Gemini·ChatGPT)에 붙여넣을 연습 프롬프트 만들기. 키 없이 템플릿으로 동작한다.
// 문장을 먼저 고르고 그 문장에 맞는 상황을 정하는 흐름이라 MUST USE를 맨 위에 둔다
export function PromptScreen() {
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState('');
  const saved = useSavedSentences();
  const gen = useSituationGenerator((s) => setDraft((d) => ({ ...d, ...s })));
  const sentences = useMemo(() => [
    ...saved.filter((s) => picked.has(s.id)).map((s) => s.en ?? ''),
    ...extra.split('\n')
  ].filter((s) => s.trim() !== ''), [saved, picked, extra]);
  const text = useMemo(() => buildPrompt({ ...draft, sentences }), [draft, sentences]);
  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  const select = useCallback((id: string) => setPicked(new Set([id])), []);
  useGenerateFrom(saved, select, gen.generate, gen.available);
  const generateButton = gen.available ? (
    <Button size="sm" variant="primary" className={styles.generate} disabled={gen.busy || sentences.length === 0}
      aria-label="고른 문장으로 상황 만들기" onClick={() => gen.generate(sentences)}>
      {gen.busy ? '…' : 'Generate'}
    </Button>
  ) : undefined;
  return (
    <>
      <ScreenHeader eyebrow="VOICE CHAT SCRIPT" title="Prompt Generator" />
      {gen.error && <p className={styles.failed} lang="ko">{gen.error}</p>}
      <SentencePicker saved={saved} selected={picked} onToggle={toggle} extra={extra} onExtra={setExtra}
        action={generateButton} />
      <PromptFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      <PromptPreview text={text} />
      {gen.busy && <GeneratingPopup />}
    </>
  );
}
