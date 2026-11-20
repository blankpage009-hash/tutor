import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { buildPrompt } from '../prompt/buildPrompt';
import { PromptFields, type Draft } from './prompt/PromptFields';
import { PromptPreview } from './prompt/PromptPreview';
import { SentencePicker } from './prompt/SentencePicker';
import { useSavedSentences } from './prompt/useSavedSentences';

const INITIAL: Draft = { situation: '', partnerRole: '', myRole: '', correction: 'later', feedbackLang: 'ko' };

// 외부 음성모드(Gemini·ChatGPT)에 붙여넣을 연습 프롬프트 만들기. 키 없이 템플릿으로 동작한다
export function PromptScreen() {
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState('');
  const saved = useSavedSentences();
  const text = useMemo(() => {
    const fromSaved = saved.filter((s) => picked.has(s.id)).map((s) => s.en ?? '');
    return buildPrompt({ ...draft, sentences: [...fromSaved, ...extra.split('\n')] });
  }, [draft, saved, picked, extra]);
  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  return (
    <>
      <ScreenHeader eyebrow="VOICE CHAT SCRIPT" title="Prompt Generator" />
      <PromptFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      <SentencePicker saved={saved} selected={picked} onToggle={toggle} extra={extra} onExtra={setExtra} />
      <PromptPreview text={text} />
    </>
  );
}
