// 실행: node scripts/content/check-quality.mjs
// 형식 검사(validate.mjs)와 달리 "내용"을 본다: 중복 문장, 난이도 역전, 음성 인식이 헷갈릴 표현.
// 결과는 대부분 경고다. 사람이 보고 고칠지 판단한다. 완전 중복만 오류로 친다.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readJson } from './validate.mjs';
import { tokenize } from './validate-core.mjs';

const NEAR_DUP = 0.8;
// 음성 인식이 글자로 잘 못 받아쓰는 감탄 소리들
const FILLERS = ['uh', 'um', 'hmm', 'mm', 'uh-huh', 'mhm', 'ugh', 'huh', 'whoa', 'yay'];
// 대문자로 써도 인식이 잘 되는 흔한 단어 (요일·달·I 등)
const CAPS_OK = new Set(['i', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
  'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september',
  'october', 'november', 'december', 'english', 'korean', 'korea', 'american', 'mr', 'mrs', 'ms', 'dr']);

function collect(courses) {
  const rows = [];
  for (const c of courses) {
    for (const l of c.lessons) {
      for (const s of l.sentences) {
        rows.push({ id: s.id, en: s.en, core: true, course: c, lesson: l });
        for (const v of s.variations) rows.push({ id: v.id, en: v.en, core: false, course: c, lesson: l });
      }
    }
  }
  return rows;
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both || 1);
}

function checkDuplicates(rows, out) {
  const byText = new Map();
  for (const r of rows) {
    const key = tokenize(r.en).join(' ');
    if (byText.has(key)) out.errors.push(`완전 중복: ${byText.get(key)} = ${r.id} "${r.en}"`);
    else byText.set(key, r.id);
  }
  const core = rows.filter((r) => r.core).map((r) => ({ ...r, t: tokenize(r.en) }));
  for (let i = 0; i < core.length; i++) {
    for (let j = i + 1; j < core.length; j++) {
      if (core[i].t.length < 4) continue;
      if (jaccard(core[i].t, core[j].t) >= NEAR_DUP) {
        out.warnings.push(`거의 같은 핵심 문장: ${core[i].id} "${core[i].en}" / ${core[j].id} "${core[j].en}"`);
      }
    }
  }
}

function checkSpeechFriendly(rows, out) {
  for (const r of rows) {
    if (/\d/.test(r.en)) out.warnings.push(`${r.id}: 숫자는 글자로 써주세요 "${r.en}"`);
    if (/[a-z]-[a-z]/i.test(r.en)) out.warnings.push(`${r.id}: 하이픈 단어는 인식이 흔들립니다 "${r.en}"`);
    const words = tokenize(r.en);
    const filler = words.find((w) => FILLERS.includes(w));
    if (filler) out.warnings.push(`${r.id}: 감탄 소리 "${filler}"는 받아쓰기가 불안정합니다`);
    // 문장 첫 단어는 원래 대문자이므로 빼고 본다 (한 줄에 문장이 여러 개일 수 있음)
    const caps = r.en.split(/[.!?]\s+/).flatMap((part) => part.split(/\s+/).slice(1))
      .map((w) => w.replace(/[^A-Za-z']/g, ''))
      .filter((w) => {
        const base = w.toLowerCase().replace(/'.*$/, '');
        return /^[A-Z]/.test(w) && !CAPS_OK.has(base) && !CAPS_OK.has(base.replace(/s$/, ''));
      });
    if (caps.length) out.warnings.push(`${r.id}: 고유명사(?) ${caps.join(', ')} — 인식이 잘 되는지 확인 필요`);
    if (r.course.register === 'formal' && /\b(gonna|wanna|gotta|ya|kinda)\b/i.test(r.en)) {
      out.warnings.push(`${r.id}: 격식체 코스에 구어 축약이 있습니다 "${r.en}"`);
    }
  }
}

function syllables(word) {
  const w = word.replace(/'.*$/, '').replace(/e$/, '');
  const groups = w.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

// 문장 길이(단어 수)와 단어 길이(음절)를 섞은 간단한 난이도 점수. 정확하지 않아도 "역전"은 잡힌다
export function difficulty(text) {
  const words = tokenize(text);
  const syl = words.reduce((n, w) => n + syllables(w), 0) / (words.length || 1);
  return words.length + 4 * (syl - 1);
}

function average(list) {
  return list.reduce((a, b) => a + b, 0) / (list.length || 1);
}

function lessonScore(lesson) {
  return average(lesson.sentences.map((s) => difficulty(s.en)));
}

function checkDifficulty(courses, out) {
  const stats = courses.map((c) => ({ c, score: average(c.lessons.map(lessonScore)) }));
  for (const s of stats) {
    out.info.push(`난이도 점수 ${s.c.id}(레벨 ${s.c.level}): ${s.score.toFixed(1)}`);
    const n = Math.max(1, Math.floor(s.c.lessons.length / 4));
    const first = average(s.c.lessons.slice(0, n).map(lessonScore));
    const last = average(s.c.lessons.slice(-n).map(lessonScore));
    if (first > last * 1.15) out.warnings.push(`${s.c.id}: 앞쪽 수업(${first.toFixed(1)})이 뒤쪽(${last.toFixed(1)})보다 어렵습니다`);
  }
  for (const a of stats) {
    for (const b of stats) {
      if (a.c.level < b.c.level && a.score > b.score) {
        out.warnings.push(`난이도 역전: ${a.c.id}(레벨 ${a.c.level}) 점수가 ${b.c.id}(레벨 ${b.c.level})보다 높습니다`);
      }
    }
  }
}

function main() {
  const manifest = readJson('manifest.json');
  const courses = manifest.courses.map((e) => readJson(e.file));
  const rows = collect(courses);
  const out = { errors: [], warnings: [], info: [] };
  checkDuplicates(rows, out);
  checkSpeechFriendly(rows, out);
  checkDifficulty(courses, out);
  for (const i of out.info) console.log('정보', i);
  for (const w of out.warnings) console.log('경고', w);
  for (const e of out.errors) console.log('오류', e);
  console.log(`\n문장 ${rows.length}개(변형 포함) · 오류 ${out.errors.length} · 경고 ${out.warnings.length}`);
  process.exitCode = out.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) main();
