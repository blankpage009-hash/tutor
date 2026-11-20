// 품사: 저장은 콘텐츠 규칙의 영어 값(noun 등)으로, 화면에는 한국어 이름으로 보인다
export const POS_OPTIONS = [
  { value: 'noun', label: '명사' },
  { value: 'verb', label: '동사' },
  { value: 'adjective', label: '형용사' },
  { value: 'adverb', label: '부사' },
  { value: 'pronoun', label: '대명사' },
  { value: 'preposition', label: '전치사' },
  { value: 'conjunction', label: '접속사' },
  { value: 'interjection', label: '감탄사' },
  { value: 'phrase', label: '표현' },
  { value: 'phrasal-verb', label: '구동사' },
  { value: 'idiom', label: '관용구' }
] as const;

export function posLabel(pos: string): string {
  return POS_OPTIONS.find((o) => o.value === pos)?.label ?? pos;
}

// 디자인 v2 단어장 줄의 짧은 영어 품사(n. / v.)와 퀴즈 카드의 긴 영어 품사(noun)
const SHORT: Record<string, string> = {
  noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.', pronoun: 'pron.', preposition: 'prep.',
  conjunction: 'conj.', interjection: 'interj.', phrase: 'phr.', 'phrasal-verb': 'phr. v.', idiom: 'idiom'
};

export function posShort(pos: string): string {
  return SHORT[pos] ?? pos;
}

export function posEnglish(pos: string): string {
  return pos.replace(/-/g, ' ');
}
