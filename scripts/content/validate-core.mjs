// 콘텐츠 형식 검사의 핵심 규칙 모음.
// 파일을 읽지 않는 순수 함수로만 둔 이유: Phase 5 "설정 → 코스 JSON 불러오기"에서
// 브라우저가 이 파일을 그대로 가져다 같은 규칙으로 검사할 수 있게 하기 위해서다.

export const SCHEMA_VERSION = 1;
export const VARIATION_TYPES = ['situation', 'subject', 'tense'];
export const POS_VALUES = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction',
  'interjection', 'phrase', 'phrasal-verb', 'idiom',
];
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// 판정 모듈(Phase 4)과 같은 방식으로 단어를 자른다: 소문자, 둥근 따옴표 통일, 문장부호 제거
export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

// 여러 단어로 된 표현(hang out 등)도 문장 안에 순서대로 있는지 본다
export function containsPhrase(sentence, phrase) {
  const s = tokenize(sentence);
  const p = tokenize(phrase);
  if (p.length === 0) return false;
  for (let i = 0; i + p.length <= s.length; i++) {
    if (p.every((w, j) => s[i + j] === w)) return true;
  }
  return false;
}

function makeReport() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    err: (where, msg) => errors.push(`${where}: ${msg}`),
    warn: (where, msg) => warnings.push(`${where}: ${msg}`),
  };
}

function isText(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function needText(r, where, obj, keys) {
  for (const k of keys) {
    if (!isText(obj?.[k])) r.err(where, `"${k}" 칸이 비었거나 글자가 아닙니다`);
  }
}

function checkId(r, where, id, expected, seen) {
  if (!isText(id) || !ID_RE.test(id)) {
    r.err(where, `id "${id}" 형식이 틀립니다 (영문 소문자·숫자·하이픈)`);
    return;
  }
  if (expected && id !== expected) r.err(where, `id가 "${expected}"여야 합니다 (지금 "${id}")`);
  if (seen.has(id)) r.err(where, `id "${id}"가 중복입니다`);
  seen.add(id);
}

function checkAudio(r, where, obj) {
  if (obj.audio === undefined) return;
  if (!isText(obj.audio) || !obj.audio.startsWith('audio/') || !obj.audio.endsWith('.m4a')) {
    r.err(where, `audio 경로 "${obj.audio}"가 audio/...m4a 형식이 아닙니다`);
  }
}

function checkVocab(r, where, s) {
  if (!Array.isArray(s.vocab) || s.vocab.length === 0) {
    r.err(where, 'vocab(단어 뜻풀이)이 비었습니다');
    return;
  }
  s.vocab.forEach((v, i) => {
    const w = `${where} vocab[${i}]`;
    needText(r, w, v, ['word', 'ko', 'pos']);
    if (isText(v.word) && !containsPhrase(s.en, v.word)) {
      r.err(w, `"${v.word}"가 문장에 없습니다`);
    }
    if (isText(v.pos) && !POS_VALUES.includes(v.pos)) r.err(w, `품사 "${v.pos}"는 정해진 값이 아닙니다`);
    if (v.lemma !== undefined && !isText(v.lemma)) r.err(w, 'lemma가 비었습니다');
    checkAudio(r, w, v);
  });
}

function checkHints(r, where, s) {
  if (!Array.isArray(s.hintWords) || s.hintWords.length === 0) {
    r.err(where, 'hintWords(빈칸 단어)가 비었습니다');
    return;
  }
  for (const h of s.hintWords) {
    if (!isText(h) || !containsPhrase(s.en, h)) r.err(where, `빈칸 단어 "${h}"가 문장에 없습니다`);
  }
}

function checkVariations(r, where, s, seen) {
  if (!Array.isArray(s.variations) || s.variations.length !== 3) {
    r.err(where, 'variations(변형)는 정확히 3개여야 합니다');
    return;
  }
  s.variations.forEach((v, i) => {
    const w = `${where} v${i + 1}`;
    checkId(r, w, v.id, `${s.id}-v${i + 1}`, seen);
    needText(r, w, v, ['en', 'ko']);
    if (!VARIATION_TYPES.includes(v.type)) r.err(w, `type "${v.type}"는 정해진 값이 아닙니다`);
    checkAudio(r, w, v);
  });
  const types = new Set(s.variations.map((v) => v.type));
  if (types.size < 3) r.warn(where, '변형 3종(상황/주어·목적어/시제)이 하나씩 있지 않습니다');
}

function checkSentence(r, s, expectedId, seen) {
  const where = expectedId;
  checkId(r, where, s?.id, expectedId, seen);
  needText(r, where, s, ['en', 'ko', 'note']);
  if (!isText(s?.en)) return;
  checkHints(r, where, s);
  checkVocab(r, where, s);
  checkVariations(r, where, s, seen);
  checkAudio(r, where, s);
}

function checkTurn(r, where, t, sentenceIds, seen) {
  if (t?.speaker === 'tutor') {
    checkId(r, where, t.id, null, seen);
    needText(r, where, t, ['en', 'ko']);
    checkAudio(r, where, t);
  } else if (t?.speaker === 'me') {
    if (!sentenceIds.includes(t.sentenceId)) {
      r.err(where, `내 대사 sentenceId "${t.sentenceId}"가 이 수업 문장이 아닙니다`);
    }
  } else {
    r.err(where, 'speaker는 "tutor" 또는 "me"여야 합니다');
  }
}

function checkRoleplay(r, lesson, seen) {
  const rp = lesson.roleplay;
  const where = `${lesson.id} 롤플레잉`;
  if (!rp) {
    r.err(where, 'roleplay가 없습니다');
    return;
  }
  checkId(r, where, rp.id, `${lesson.id}-r`, seen);
  needText(r, where, rp, ['situation', 'tutorRole', 'myRole']);
  if (!Array.isArray(rp.turns) || rp.turns.length < 4 || rp.turns.length > 8) {
    r.err(where, '대사(turns)는 4~8줄이어야 합니다');
    return;
  }
  const sentenceIds = (lesson.sentences || []).map((s) => s.id);
  rp.turns.forEach((t, i) => checkTurn(r, `${where} ${i + 1}번째 줄`, t, sentenceIds, seen));
  const used = new Set(rp.turns.filter((t) => t.speaker === 'me').map((t) => t.sentenceId));
  for (const id of sentenceIds) {
    if (!used.has(id)) r.warn(where, `핵심 문장 ${id}를 내 대사로 쓰지 않았습니다`);
  }
}

function checkLesson(r, lesson, expectedId, seen) {
  checkId(r, expectedId, lesson?.id, expectedId, seen);
  needText(r, expectedId, lesson, ['title', 'titleKo', 'intro']);
  if (!Array.isArray(lesson?.sentences) || lesson.sentences.length < 2 || lesson.sentences.length > 3) {
    r.err(expectedId, '핵심 문장은 2~3개여야 합니다');
    return;
  }
  lesson.sentences.forEach((s, i) => checkSentence(r, s, `${expectedId}-s${i + 1}`, seen));
  checkRoleplay(r, lesson, seen);
}

// seen: 여러 코스를 함께 검사할 때 id 중복을 코스 사이에서도 잡으려고 바깥에서 넘겨받는다
export function validateCourse(course, seen = new Set()) {
  const r = makeReport();
  const where = `코스 ${course?.id ?? '(id 없음)'}`;
  if (course?.schemaVersion !== SCHEMA_VERSION) r.err(where, `schemaVersion은 ${SCHEMA_VERSION}이어야 합니다`);
  checkId(r, where, course?.id, null, seen);
  needText(r, where, course, ['idPrefix', 'title', 'titleKo', 'description']);
  if (![1, 2, 3, 4].includes(course?.level)) r.err(where, 'level은 1~4여야 합니다');
  if (!['casual', 'formal'].includes(course?.register)) r.err(where, 'register는 casual 또는 formal');
  if (!Array.isArray(course?.lessons) || course.lessons.length === 0) {
    r.err(where, '수업(lessons)이 없습니다');
    return { errors: r.errors, warnings: r.warnings };
  }
  course.lessons.forEach((l, i) => {
    checkLesson(r, l, `${course.idPrefix}-${String(i + 1).padStart(2, '0')}`, seen);
  });
  return { errors: r.errors, warnings: r.warnings };
}

export function validateManifest(manifest) {
  const r = makeReport();
  if (manifest?.schemaVersion !== SCHEMA_VERSION) r.err('manifest', `schemaVersion은 ${SCHEMA_VERSION}이어야 합니다`);
  if (!Array.isArray(manifest?.courses)) {
    r.err('manifest', 'courses 목록이 없습니다');
    return { errors: r.errors, warnings: r.warnings };
  }
  const ids = new Set();
  manifest.courses.forEach((c, i) => {
    const where = `manifest courses[${i}]`;
    needText(r, where, c, ['id', 'file', 'title', 'titleKo']);
    if (ids.has(c.id)) r.err(where, `코스 id "${c.id}" 중복`);
    ids.add(c.id);
    if (typeof c.order !== 'number') r.err(where, 'order는 숫자여야 합니다');
    if (![1, 2, 3, 4].includes(c.level)) r.err(where, 'level은 1~4여야 합니다');
  });
  return { errors: r.errors, warnings: r.warnings };
}

// 문장·변형·튜터 대사·단어처럼 소리가 필요한 모든 글을 한 줄씩 꺼낸다 (음성 스크립트·검사기 공용)
export function listSpokenItems(course) {
  const items = [];
  for (const lesson of course.lessons || []) {
    for (const s of lesson.sentences || []) {
      items.push({ kind: 'sentence', obj: s, id: s.id, text: s.en });
      for (const v of s.variations || []) items.push({ kind: 'variation', obj: v, id: v.id, text: v.en });
      for (const w of s.vocab || []) items.push({ kind: 'word', obj: w, id: null, text: w.lemma || w.word });
    }
    for (const t of lesson.roleplay?.turns || []) {
      if (t.speaker === 'tutor') items.push({ kind: 'tutor', obj: t, id: t.id, text: t.en });
    }
  }
  return items;
}
