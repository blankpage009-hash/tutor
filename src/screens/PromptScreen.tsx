import { useMemo, useState } from 'react';
import { BackLink } from '../components/BackLink';
import { ScreenHeader } from '../components/ScreenHeader';
import { buildPrompt } from '../prompt/buildPrompt';
import { PromptFields, type Draft } from './prompt/PromptFields';
import { PromptPreview } from './prompt/PromptPreview';
import { SentencePicker } from './prompt/SentencePicker';
import { useSavedSentences } from './prompt/useSavedSentences';
import styles from './prompt/Prompt.module.css';

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
      <BackLink to="/more" label="더보기" />
      <ScreenHeader eyebrow="더보기" title="프롬프트 만들기" />
      <p className={styles.intro} lang="ko">
        고른 문장을 쓰게 만드는 연습 대본을 만들어 줘요. 복사해서 Gemini나 ChatGPT의 음성 대화에 붙여넣으면 돼요.
      </p>
      <PromptFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      <SentencePicker saved={saved} selected={picked} onToggle={toggle} extra={extra} onExtra={setExtra} />
      <PromptPreview text={text} />
    </>
  );
}
