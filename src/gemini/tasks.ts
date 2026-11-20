// Gemini에게 시킬 일(새 롤플레잉 상황)의 요청문과, 돌아온 글자를 앱이 쓰는 모양으로 바꾸는 검사.
// 요청과 응답 검사를 화면·네트워크와 떼어 두어 시험으로 확인한다. 응답은 믿지 않고 모양을 하나씩 확인한다.
import type { RolePlayLine } from '../content/lessonTypes';
import { GeminiError, type GeminiRequest } from './geminiClient';

const BAD_FORMAT = '결과의 모양이 이상해요. 다시 해 주세요.';

// ```json … ``` 울타리나 앞뒤 설명이 붙어 와도 JSON 부분만 꺼낸다
function parseJson(text: string): unknown {
  const body = text.replace(/```(?:json)?/gi, '');
  const start = body.search(/[{[]/);
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    throw new GeminiError(BAD_FORMAT);
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// ── 새 롤플레잉 상황 ────────────────────────────────────────
export type GeneratedRolePlay = { title: string; situation: string; partnerRole: string; lines: RolePlayLine[] };
const MAX_LINES = 10;
const MAX_KEYWORDS = 3;

export function roleplayRequest(hint: string): GeminiRequest {
  return {
    json: true,
    prompt: [
      'Create a short scripted role-play for a Korean learner of American English (CEFR A2-B1).',
      `Situation idea: ${hint.trim() || 'a common everyday situation'}`,
      'Write 6 to 8 lines, alternating: the partner speaks first, then the learner ("me"), and so on.',
      'Return JSON only, in this shape:',
      '{"title": Korean title, "situation": Korean one-sentence setting, "partnerRole": Korean role name,',
      ' "lines": [',
      '  {"speaker": "partner", "en": "...", "ko": "..."},',
      '  {"speaker": "me", "exampleEn": "a natural sample answer", "exampleKo": "...", "requiredKeywords": ["1-2 key words or short phrases that appear EXACTLY in exampleEn"]}',
      ' ]}',
      'Keep each line short (under 12 words) and natural.'
    ].join('\n')
  };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

// 예시 답에 실제로 없는 키워드는 버린다: 있지도 않은 말이 "꼭 넣을 말"이면 아무리 해도 통과할 수 없다
export function validKeywords(raw: unknown, exampleEn: string): string[] {
  if (!Array.isArray(raw)) return [];
  const hay = ` ${norm(exampleEn)} `;
  return raw.map(str).filter((k) => k && hay.includes(` ${norm(k)} `)).slice(0, MAX_KEYWORDS);
}

type RawLine = Record<string, unknown>;

function toLine(raw: RawLine, no: number): RolePlayLine | null {
  if (raw?.speaker === 'partner') {
    const en = str(raw.en);
    return en ? { no, speaker: 'partner', en, ko: str(raw.ko), audio: '' } : null;
  }
  if (raw?.speaker === 'me') {
    const exampleEn = str(raw.exampleEn);
    if (!exampleEn) return null;
    return {
      no, speaker: 'me', freeResponse: true, exampleEn, exampleKo: str(raw.exampleKo),
      requiredKeywords: validKeywords(raw.requiredKeywords, exampleEn)
    };
  }
  return null;
}

export function parseRoleplay(text: string): GeneratedRolePlay {
  const data = parseJson(text) as { title?: unknown; situation?: unknown; partnerRole?: unknown; lines?: unknown };
  if (!Array.isArray(data?.lines)) throw new GeminiError(BAD_FORMAT);
  const lines: RolePlayLine[] = [];
  for (const raw of data.lines.slice(0, MAX_LINES)) {
    const line = toLine(raw as RawLine, lines.length + 1);
    if (line) lines.push(line);
  }
  const mine = lines.filter((l) => l.speaker === 'me').length;
  if (lines.length < 2 || !mine || mine === lines.length) throw new GeminiError(BAD_FORMAT);
  return {
    title: str(data.title) || '새 상황',
    situation: str(data.situation),
    partnerRole: str(data.partnerRole) || '상대',
    lines
  };
}

// ── 고른 문장에 맞는 상황 (프롬프트 만들기의 상황·상대·나 칸) ─────────────
export type GeneratedSituation = { situation: string; partnerRole: string; myRole: string };
// 응답을 그대로 칸에 넣으므로 너무 긴 글은 자른다: 칸은 한 줄짜리라 길면 프롬프트가 흐려진다
const MAX_SITUATION = 80;
const MAX_ROLE = 30;

export function situationRequest(sentences: string[]): GeminiRequest {
  const list = sentences.map((s) => s.trim()).filter(Boolean).map((s) => `- ${s}`);
  return {
    json: true,
    prompt: [
      'A Korean learner of American English wants to practice these sentences in a spoken role-play:',
      ...list,
      'Invent ONE realistic everyday situation in the U.S. where the learner would naturally use ALL of these sentences.',
      'Return JSON only, in this shape (all values in Korean, short):',
      '{"situation": one short line describing the setting (under 30 Korean characters),',
      ' "partnerRole": the other person\'s role (a few words), "myRole": the learner\'s role (a few words)}'
    ].join('\n')
  };
}

export function parseSituation(text: string): GeneratedSituation {
  const data = parseJson(text) as { situation?: unknown; partnerRole?: unknown; myRole?: unknown };
  const situation = str(data?.situation).slice(0, MAX_SITUATION);
  const partnerRole = str(data?.partnerRole).slice(0, MAX_ROLE);
  const myRole = str(data?.myRole).slice(0, MAX_ROLE);
  if (!situation || !partnerRole || !myRole) throw new GeminiError(BAD_FORMAT);
  return { situation, partnerRole, myRole };
}
