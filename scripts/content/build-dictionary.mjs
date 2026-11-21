// 단어 저장 창의 사전(content/dictionary.json)을 만든다. (2026-11-21, 옛 build-glossary.mjs를 대신함)
// 재료: ① content/dictionary-src/words/*.json — Claude가 직접 쓴 표제어(뜻 여러 개·발음기호·예문·표현·변화형)
//       ② content/dictionary-src/context/*.json — 레슨 문장마다 "이 문장에서는 몇 번째 뜻"
//       ③ 옛 content/glossary.json — 원고에 없는 단어만 뜻 1개짜리로 (나중 레슨에서 쓸 수 있게)
// 검사에 걸리면 파일을 만들지 않고 멈춘다. 끝에 "레슨 단어 중 사전에 없는 단어"를 보여 준다(새 레슨 만들 때 확인용).
// 실행: node scripts/content/build-dictionary.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POS_VALUES } from './validate-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const content = (...p) => path.join(root, 'content', ...p);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const jsonFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []);

// 사전에서는 관사·조동사도 따로 보여 준다 (레슨 파일 검사의 품사 목록은 그대로)
const DICT_POS = [...POS_VALUES, 'determiner', 'auxiliary'];
// 변화형 이름: 3인칭 단수·과거·과거분사·현재분사·복수·비교급·최상급
const FORM_KEYS = ['3s', 'past', 'pp', 'ing', 'pl', 'er', 'est'];

const errors = [];
const warnings = [];
const isText = (v) => typeof v === 'string' && v.trim() !== '';
// 앱(src/wordTap.ts normalizeWord)과 같은 규칙: 소문자, 둥근 따옴표는 곧은 따옴표로
const norm = (w) => w.toLowerCase().replace(/[‘’]/g, "'").trim();
// 앱(src/content/dictionary.ts sentenceKey)과 같은 규칙
const sentenceKey = (s) => norm(s).replace(/\s+/g, ' ');
const WORD_RE = /\p{L}+(?:['’-]\p{L}+)*/gu;

function checkPairs(where, list, name) {
  if (list === undefined) return;
  if (!Array.isArray(list)) return errors.push(`${where}: ${name}는 목록이어야 합니다`);
  list.forEach((p, i) => {
    if (!isText(p?.en) || !isText(p?.ko)) errors.push(`${where}: ${name}[${i}]에 en·ko가 다 있어야 합니다`);
  });
}

function checkEntry(head, e, file) {
  const where = `${file} "${head}"`;
  if (head !== norm(head)) errors.push(`${where}: 표제어는 소문자로 적습니다`);
  if (!Array.isArray(e?.senses) || e.senses.length === 0) return errors.push(`${where}: senses(뜻)가 없습니다`);
  e.senses.forEach((s, i) => {
    if (!isText(s?.ko)) errors.push(`${where}: senses[${i}] 뜻이 비었습니다`);
    if (!DICT_POS.includes(s?.pos)) errors.push(`${where}: senses[${i}] 품사 "${s?.pos}"는 정해진 값이 아닙니다`);
  });
  if (e.ipa !== undefined && !isText(e.ipa)) errors.push(`${where}: ipa가 비었습니다`);
  if (e.forms !== undefined) {
    for (const [k, v] of Object.entries(e.forms)) {
      if (!FORM_KEYS.includes(k)) errors.push(`${where}: 변화형 이름 "${k}"는 ${FORM_KEYS.join('·')} 중 하나여야 합니다`);
      if (!isText(v)) errors.push(`${where}: 변화형 ${k}가 비었습니다`);
    }
  }
  checkPairs(where, e.examples, 'examples');
  checkPairs(where, e.phrases, 'phrases');
}

// ① 표제어
const entries = {};
for (const file of jsonFiles(content('dictionary-src', 'words'))) {
  for (const [head, e] of Object.entries(readJson(content('dictionary-src', 'words', file)))) {
    if (head.startsWith('_')) continue;
    if (head in entries) { errors.push(`${file} "${head}": 다른 파일에 이미 있습니다`); continue; }
    checkEntry(head, e, file);
    entries[head] = e;
  }
}

// 변화형 → 표제어 (went → go). 두 표제어가 같은 변화형을 가지면 먼저 나온 쪽을 쓰고 알려 준다
const forms = {};
for (const [head, e] of Object.entries(entries)) {
  for (const f of Object.values(e.forms ?? {})) {
    const key = norm(f);
    if (key === head) continue;
    if (forms[key] && forms[key] !== head) { warnings.push(`변화형 "${key}"가 ${forms[key]}·${head} 둘 다에 있어 ${forms[key]}로 둡니다`); continue; }
    forms[key] = head;
  }
}

// 단어 발음 (scripts/audio/make_word_audio.py가 만든 목록). 파일이 없는 단어는 앱에서 🔊을 숨긴다
const audioPath = content('dictionary-src', 'audio.json');
const audio = fs.existsSync(audioPath) ? readJson(audioPath) : {};
let noAudio = 0;
for (const [head, e] of Object.entries(entries)) {
  const rel = audio[head];
  if (rel && fs.existsSync(content(rel))) e.audio = rel;
  else noAudio++;
}

// ③ 옛 사전에만 있는 단어 (원고·변화형에 있으면 원고가 이김)
const written = new Set(Object.keys(entries));
let fromOld = 0;
const oldPath = content('glossary.json');
if (fs.existsSync(oldPath)) {
  for (const [w, [ko, pos]] of Object.entries(readJson(oldPath).words)) {
    if (w in entries || w in forms) continue;
    entries[w] = { senses: [{ pos, ko }] };
    fromOld++;
  }
}

// 앱(src/content/glossary.ts wordCandidates)과 같은 "원래 모양" 후보. 검사용이라 여기에도 둔다
function candidates(w) {
  const out = [w];
  const add = (c) => { if (c.length >= 3 && !out.includes(c)) out.push(c); };
  if (w.endsWith("'s")) add(w.slice(0, -2));
  if (w.endsWith('ies')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s')) add(w.slice(0, -1));
  if (w.endsWith('ied')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('ed')) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    add(stem); add(`${stem}e`);
    if (/([^aeiou])\1$/.test(stem)) add(stem.slice(0, -1));
  }
  if (w.endsWith('er') || w.endsWith('est')) add(w.replace(/(er|est)$/, ''));
  return out;
}

function resolve(word) {
  const w = norm(word);
  if (w in entries) return w;
  if (w in forms) return forms[w];
  return candidates(w).find((c) => c in entries) ?? null;
}

// ② 이 문장에서의 뜻. 값은 뜻 번호(0부터) 또는 다른 표제어를 가리키는 "leave:0" (left처럼 모양이 같은 다른 단어일 때)
const context = {};
for (const file of jsonFiles(content('dictionary-src', 'context'))) {
  for (const [sentence, words] of Object.entries(readJson(content('dictionary-src', 'context', file)))) {
    if (sentence.startsWith('_')) continue;
    const key = sentenceKey(sentence);
    const inSentence = new Set((sentence.match(WORD_RE) ?? []).map(norm));
    const out = (context[key] ??= {});
    for (const [word, val] of Object.entries(words)) {
      const where = `${file} "${sentence}" ${word}`;
      const w = norm(word);
      if (!inSentence.has(w)) { errors.push(`${where}: 문장에 없는 단어입니다`); continue; }
      const [head, idx] = typeof val === 'string' ? [val.split(':')[0], Number(val.split(':')[1])] : [resolve(w), val];
      const entry = head ? entries[head] : undefined;
      if (!entry) { errors.push(`${where}: 사전에 없는 단어입니다`); continue; }
      if (!Number.isInteger(idx) || idx < 0 || idx >= entry.senses.length) { errors.push(`${where}: 뜻 번호 ${val}가 범위 밖입니다`); continue; }
      out[w] = typeof val === 'string' ? val : idx;
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n오류 ${errors.length}개 — dictionary.json을 만들지 않았습니다`);
  process.exit(1);
}

// 레슨 단어 중 사전에 없는 것 (영어 글자가 들어가는 칸을 모두 훑는다)
const EN_FIELDS = new Set(['en', 'exampleEn', 'right', 'stress']);
const lessonWords = new Set();
const lessonSentences = new Set();
function scan(o, k) {
  if (typeof o === 'string') {
    if (!EN_FIELDS.has(k)) return;
    lessonSentences.add(sentenceKey(o));
    for (const m of o.match(WORD_RE) ?? []) lessonWords.add(norm(m));
  } else if (o && typeof o === 'object') {
    for (const [kk, v] of Object.entries(o)) scan(v, Array.isArray(o) ? k : kk);
  }
}
const lessonsDir = content('lessons');
for (const level of fs.existsSync(lessonsDir) ? fs.readdirSync(lessonsDir) : []) {
  for (const f of jsonFiles(path.join(lessonsDir, level))) scan(readJson(path.join(lessonsDir, level, f)), '');
}
// 레슨 단어는 옛 사전의 뜻 1개짜리가 아니라 원고에 제대로 있어야 한다
const missing = [...lessonWords].filter((w) => !written.has(resolve(w))).sort();
// 문장 글자가 한 글자라도 다르면 앱에서 못 찾으니 알려 준다
for (const key of Object.keys(context)) {
  if (!lessonSentences.has(key)) warnings.push(`context 문장이 레슨에 없습니다(글자 확인): ${key}`);
}

const sorted = Object.fromEntries(Object.keys(entries).sort().map((k) => [k, entries[k]]));
fs.writeFileSync(content('dictionary.json'), JSON.stringify({ schemaVersion: 1, entries: sorted, forms, context }));
if (warnings.length) console.warn(warnings.join('\n'));
console.log(`dictionary.json: 표제어 ${Object.keys(sorted).length}개(옛 사전에서 ${fromOld}개), 변화형 ${Object.keys(forms).length}개, 문장 ${Object.keys(context).length}개`);
console.log(`발음 음성: 원고 표제어 ${written.size}개 중 없는 단어 ${noAudio}개${noAudio ? ' → make_word_audio.py 실행' : ''}`);
console.log(`레슨 단어 ${lessonWords.size}개 중 사전에 없는 단어 ${missing.length}개${missing.length ? `:\n${missing.join(' ')}` : ''}`);
