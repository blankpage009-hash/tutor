import { liveQuery } from 'dexie';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '../../db/db';
import { normalizeWord } from '../../wordTap';
import { WordSheet } from './WordSheet';

// 단어를 눌렀을 때 "이 문장의 이 단어"를 저장 창에 알려 주는 정보
export type WordSource = { id: string; en: string; ko: string };
type PickWord = (word: string, source: WordSource) => void;

const PickContext = createContext<PickWord | null>(null);
const SavedContext = createContext<ReadonlySet<string>>(new Set());

// 단어장의 단어(소문자) 목록을 지켜본다. 단어장 화면에서 빼거나 백업을 복원해도 밑줄이 저절로 따라 바뀌게
// 한 번 읽고 끝내지 않고 liveQuery로 바뀔 때마다 다시 받는다
function useSavedWordSet(): ReadonlySet<string> {
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const sub = liveQuery(() => db.vocab.orderBy('word').uniqueKeys()).subscribe({
      next: (keys) => setSaved(new Set(keys as string[])),
      error: () => setSaved(new Set()),
    });
    return () => sub.unsubscribe();
  }, []);
  return saved;
}

// 화면마다 저장 창을 따로 두지 않고 앱 전체에 하나만 둔다 (눌린 단어를 이 안에서 받는다)
export function WordPickerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<{ word: string; source: WordSource } | null>(null);
  const saved = useSavedWordSet();
  // 누르면 늘 저장 창을 띄워 뜻을 확인하고 저장한다 (바로 저장은 사용자 요청으로 되돌림 2026-11-21)
  const pick = useCallback<PickWord>((word, source) => setTarget({ word, source }), []);
  const close = useCallback(() => setTarget(null), []);
  return (
    <PickContext.Provider value={pick}>
      <SavedContext.Provider value={saved}>
        {children}
        {target && <WordSheet key={`${target.source.id}:${target.word}`} word={target.word} source={target.source} onClose={close} />}
      </SavedContext.Provider>
    </PickContext.Provider>
  );
}

// 제공자가 없으면(테스트 등) null — 그때는 글자만 보이고 눌러도 아무 일이 없다
export function usePickWord(): PickWord | null {
  return useContext(PickContext);
}

// 단어 버튼이 "이 단어는 단어장에 있나?"를 물어 밑줄을 그릴지 정한다
export function useIsSaved(): (word: string) => boolean {
  const saved = useContext(SavedContext);
  return useCallback((word: string) => saved.has(normalizeWord(word)), [saved]);
}
