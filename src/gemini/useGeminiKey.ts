import { useEffect, useState } from 'react';
import { getGeminiKey } from '../db/settings';

// 화면이 열릴 때 키를 한 번 읽는다. 설정에서 키를 넣고 돌아오면 화면이 새로 열리므로 이걸로 충분하다.
// 키가 없으면 빈 글자 — 생성 버튼은 이 값이 있을 때만 그린다
export function useGeminiKey(): string {
  const [key, setKey] = useState('');
  useEffect(() => {
    getGeminiKey().then(setKey, () => setKey(''));
  }, []);
  return key;
}
