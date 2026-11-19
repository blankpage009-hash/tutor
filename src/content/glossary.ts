// 단어 뜻 사전(content/glossary.json, scripts/content/build-glossary.mjs가 만든다).
// 누른 단어의 뜻·품사를 저장 창에 미리 채워 주는 용도라, 못 읽거나 단어가 없어도 앱은 그대로 동작한다.
import { normalizeWord } from '../wordTap';
import { contentUrl } from './loader';

export type GlossaryEntry = { ko: string; pos: string };
export type GlossaryWords = Record<string, [string, string]>;

// 누른 단어가 사전에 없을 때 시도해 볼 "원래 모양" 후보 (복수·과거·진행형을 걷어 낸다)
export function wordCandidates(word: string): string[] {
  const w = normalizeWord(word);
  const out = [w];
  const add = (c: string) => { if (c.length >= 3 && !out.includes(c)) out.push(c); };
  if (w.endsWith("'s")) add(w.slice(0, -2));
  if (w.endsWith('ies')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s')) add(w.slice(0, -1));
  if (w.endsWith('ied')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('ed')) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    add(stem); add(`${stem}e`);
    if (/([^aeiou])\1$/.test(stem)) add(stem.slice(0, -1)); // running → runn → run
  }
  if (w.endsWith('er') || w.endsWith('est')) add(w.replace(/(er|est)$/, ''));
  return out;
}

export function lookupWord(words: GlossaryWords, word: string): GlossaryEntry | null {
  for (const c of wordCandidates(word)) {
    const hit = Object.hasOwn(words, c) ? words[c] : undefined;
    if (hit) return { ko: hit[0], pos: hit[1] };
  }
  return null;
}

let glossaryPromise: Promise<GlossaryWords> | null = null;

// 실패하면 빈 사전을 주고(저장 창은 직접 입력으로 동작), 다음에 다시 시도하도록 약속을 지운다
export function loadGlossary(): Promise<GlossaryWords> {
  glossaryPromise ??= fetch(contentUrl('glossary.json'))
    .then((res) => (res.ok ? (res.json() as Promise<{ words: GlossaryWords }>) : Promise.reject(new Error(String(res.status)))))
    .then((g) => g.words)
    .catch(() => {
      glossaryPromise = null;
      return {} as GlossaryWords;
    });
  return glossaryPromise;
}
