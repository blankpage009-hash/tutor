import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { WordSheet } from './WordSheet';

// 단어를 눌렀을 때 "이 문장의 이 단어"를 저장 창에 알려 주는 정보
export type WordSource = { id: string; en: string; ko: string };
type PickWord = (word: string, source: WordSource) => void;

const PickContext = createContext<PickWord | null>(null);

// 화면마다 저장 창을 따로 두지 않고 앱 전체에 하나만 둔다 (눌린 단어를 이 안에서 받는다)
export function WordPickerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<{ word: string; source: WordSource } | null>(null);
  const pick = useCallback<PickWord>((word, source) => setTarget({ word, source }), []);
  const close = useCallback(() => setTarget(null), []);
  return (
    <PickContext.Provider value={pick}>
      {children}
      {target && <WordSheet key={`${target.source.id}:${target.word}`} word={target.word} source={target.source} onClose={close} />}
    </PickContext.Provider>
  );
}

// 제공자가 없으면(테스트 등) null — 그때는 글자만 보이고 눌러도 아무 일이 없다
export function usePickWord(): PickWord | null {
  return useContext(PickContext);
}
