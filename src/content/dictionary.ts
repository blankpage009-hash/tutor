// 단어 저장 창의 사전(content/dictionary.json, scripts/content/build-dictionary.mjs가 만든다).
// 못 읽거나 단어가 없어도 저장 창은 직접 입력으로 동작한다.
import { normalizeWord } from '../wordTap';
import { wordCandidates } from './glossary';
import { contentUrl } from './loader';

export type Sense = { pos: string; ko: string };
export type Pair = { en: string; ko: string };
export type FormKey = '3s' | 'past' | 'pp' | 'ing' | 'pl' | 'er' | 'est';
export type DictEntry = {
  ipa?: string;
  audio?: string; // 표제어 발음 파일 (content/ 기준 경로). 없으면 🔊 버튼을 숨긴다
  forms?: Partial<Record<FormKey, string>>;
  senses: Sense[];
  examples?: Pair[];
  phrases?: Pair[];
};
// context 값: 뜻 번호, 또는 모양이 같은 다른 단어를 가리키는 "leave:0"
export type Dictionary = {
  entries: Record<string, DictEntry>;
  forms: Record<string, string>;
  // 변화형 자신의 발음 파일 (bigger → audio/dict/bigger-….m4a). 표제어 발음은 entries[head].audio에 있다
  formAudio?: Record<string, string>;
  context: Record<string, Record<string, number | string>>;
};
export type LookupHit = {
  head: string;
  entry: DictEntry;
  formOf?: FormKey[]; // 누른 단어가 head의 어떤 변화형인지 (went → ['past'])
  alsoFormOf?: string; // left처럼 그 자체로도 단어이고 다른 단어(leave)의 변화형이기도 할 때
};

export const EMPTY_DICTIONARY: Dictionary = { entries: {}, forms: {}, context: {} };

export const FORM_LABEL: Record<FormKey, string> = {
  '3s': '3인칭 단수', past: '과거', pp: '과거분사', ing: '현재분사', pl: '복수', er: '비교급', est: '최상급',
};

const has = <T>(o: Record<string, T>, k: string): T | undefined => (Object.hasOwn(o, k) ? o[k] : undefined);

function formKeys(entry: DictEntry, word: string): FormKey[] {
  return (Object.entries(entry.forms ?? {}) as [FormKey, string][])
    .filter(([, v]) => normalizeWord(v) === word).map(([k]) => k);
}

function hitFor(dict: Dictionary, head: string, word: string): LookupHit | null {
  const entry = has(dict.entries, head);
  if (!entry) return null;
  const formOf = head === word ? [] : formKeys(entry, word);
  return { head, entry, ...(formOf.length ? { formOf } : {}) };
}

// 표제어 그대로 → 변화형 표(went → go) → 복수·과거·진행형을 걷어 낸 모양 순서로 찾는다
// 누른 그 모양 그대로의 발음 파일. 표제어 자신이면 표제어 파일, 변화형이면 변화형 파일.
// 표제어 소리(big)로 변화형(bigger)을 대신하지 않으려고 모양이 같을 때만 돌려준다 (없으면 null)
export function exactAudio(dict: Dictionary, word: string): string | null {
  const w = normalizeWord(word);
  return (has(dict.entries, w)?.audio) ?? has(dict.formAudio ?? {}, w) ?? null;
}

export function lookupEntry(dict: Dictionary, word: string): LookupHit | null {
  const w = normalizeWord(word);
  const formHead = has(dict.forms, w);
  const exact = hitFor(dict, w, w);
  if (exact) return formHead ? { ...exact, alsoFormOf: formHead } : exact;
  if (formHead) {
    const hit = hitFor(dict, formHead, w);
    if (hit) return hit;
  }
  for (const c of wordCandidates(w).slice(1)) {
    const hit = hitFor(dict, c, w);
    if (hit) return hit;
  }
  return null;
}

// 문장 열쇠: 화면마다 문장 id 규칙이 달라서 영어 글자 자체로 찾는다 (스크립트와 같은 규칙)
export function sentenceKey(en: string): string {
  return normalizeWord(en).trim().replace(/\s+/g, ' ');
}

export type ContextHit = { hit: LookupHit; index: number };

// 이 문장에서 쓰인 뜻. "leave:0"처럼 다른 표제어를 가리키면 그 단어로 바꿔서 돌려준다
export function contextSense(dict: Dictionary, sentenceEn: string, word: string): ContextHit | null {
  const w = normalizeWord(word);
  const val = has(has(dict.context, sentenceKey(sentenceEn)) ?? {}, w);
  if (val === undefined) return null;
  if (typeof val === 'number') {
    const hit = lookupEntry(dict, w);
    return hit && val < hit.entry.senses.length ? { hit, index: val } : null;
  }
  const [head, idx] = val.split(':');
  const hit = hitFor(dict, head, w);
  const index = Number(idx);
  return hit && index < hit.entry.senses.length ? { hit, index } : null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 표현 속 "someone·something"은 아무 말 1~3단어로 본다 (torn between A and B의 A처럼)
const SLOT = new Set(['someone', 'something', "someone's", "one's", 'sb', 'sth', '~']);
const ANY = "[\\p{L}'’-]+(?:\\s+[\\p{L}'’-]+){0,2}";

function phraseRegex(phrase: string, head: string, entry: DictEntry): RegExp {
  const variants = [head, ...Object.values(entry.forms ?? {})].map((v) => escape(normalizeWord(v)));
  const parts = normalizeWord(phrase).split(/\s+/).map((t) => {
    if (SLOT.has(t)) return ANY;
    if (t === head) return `(?:${variants.join('|')})`;
    // 표제어가 아닌 단어도 흔한 꼬리는 붙어도 된다 (fit our budget ↔ fits our budget)
    return `${escape(t)}(?:s|es|ed|d|ing)?`;
  });
  return new RegExp(`(?<![\\p{L}'])${parts.join('\\s+')}(?![\\p{L}'])`, 'u');
}

// 이 단어의 "자주 쓰는 표현" 중 이 문장에 실제로 들어 있는 것 (went out → go out)
export function phraseInSentence(hit: LookupHit, sentenceEn: string): Pair | null {
  const sentence = sentenceKey(sentenceEn);
  return hit.entry.phrases?.find((p) => phraseRegex(p.en, hit.head, hit.entry).test(sentence)) ?? null;
}

// 화면에 보일 때는 자리 표시 단어를 ~로 (torn between something → torn between ~)
export function phraseLabel(en: string): string {
  return en.replace(/\bsomeone's\b/g, "~'s").replace(/\b(?:something|someone)\b/g, '~');
}

// 단어장에 저장할 뜻: 사전 뜻의 괄호 설명은 빼고 핵심만 ("(be torn between) 둘 사이에서 고민하는" → "둘 사이에서 고민하는")
export function meaningForSave(ko: string): string {
  const short = ko.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return short || ko;
}

export function naverUrl(word: string): string {
  return `https://en.dict.naver.com/#/search?query=${encodeURIComponent(normalizeWord(word))}`;
}

let dictPromise: Promise<Dictionary> | null = null;

// 실패하면 빈 사전을 주고(저장 창은 직접 입력으로 동작), 다음에 다시 시도하도록 약속을 지운다
export function loadDictionary(): Promise<Dictionary> {
  dictPromise ??= fetch(contentUrl('dictionary.json'))
    .then((res) => (res.ok ? (res.json() as Promise<Dictionary>) : Promise.reject(new Error(String(res.status)))))
    .then((d) => ({ entries: d.entries ?? {}, forms: d.forms ?? {}, formAudio: d.formAudio ?? {}, context: d.context ?? {} }))
    .catch(() => {
      dictPromise = null;
      return EMPTY_DICTIONARY;
    });
  return dictPromise;
}
