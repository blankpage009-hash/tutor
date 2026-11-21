// 외부 음성모드(Gemini·ChatGPT)에 붙여넣을 연습 프롬프트를 템플릿으로 조립하는 순수 모듈.
// 붙여넣는 상대가 영어 모델이라 지시문은 영어로 쓴다. 키 없이도 동작해야 하므로 AI 호출은 쓰지 않는다.
// 결과가 늘 같은 구조여야 AI가 매번 같은 방식으로 연습을 진행하므로, 칸 제목([Scenario] 등)은 고정한다.

export type Correction = 'now' | 'later';
export type FeedbackLang = 'en' | 'ko';

export type PromptOptions = {
  situation: string;
  partnerRole: string;
  myRole: string;
  sentences: string[];
  correction: Correction;
  feedbackLang: FeedbackLang;
};

const DEFAULT_SITUATION = 'a casual everyday conversation';
// 템플릿 뒤에 "(native American English speaker)"가 붙으므로 기본값엔 그 말을 다시 넣지 않는다.
const DEFAULT_PARTNER = 'a friendly person';
const DEFAULT_ME = 'myself';

// 'now'는 따라 말하기를 유지해 달라는 요청에 따라 "고친 문장 → 따라 하기 → 대화 계속" 순서를 지킨다.
const CORRECTION_RULE: Record<Correction, string> = {
  now: 'If I make a mistake or sound unnatural, briefly say the corrected sentence once, let me repeat it, then immediately continue the roleplay in character. Keep corrections short so the conversation flows smoothly.',
  later: 'Do not correct me during the roleplay. When I say "Let\'s wrap up" or "피드백 줘", end the roleplay, list my mistakes with natural American English corrections, and review how I used the target expressions.'
};

const FEEDBACK_RULE: Record<FeedbackLang, string> = {
  en: 'Give all feedback, explanations, and corrected sentences in clear, simple English.',
  ko: 'Give feedback and explanations in Korean, but keep example and corrected sentences in English.'
};

function orDefault(value: string, fallback: string): string {
  const v = value.trim();
  return v || fallback;
}

export function cleanSentences(raw: string[]): string[] {
  return raw.map((s) => s.trim()).filter(Boolean);
}

function targetSection(sentences: string[]): string[] {
  // 문장이 없을 때 빈 칸을 남기면 AI가 "무엇을 유도하라는 건지" 헷갈리므로 칸을 통째로 뺀다.
  if (!sentences.length) return [];
  return [
    '[Target Expressions]',
    ...sentences.map((s) => `- ${s}`),
    '- Rule: Do NOT say these expressions for me. Naturally steer the conversation to create openings for me to use each one.',
    ''
  ];
}

// 음성 대화가 길어지면 AI가 처음 지시를 잊고 평소 말투(긴 설명·목록 등)로 돌아가므로, 맨 끝에서 한 번 더 못 박는다.
const FINAL_REMINDER = [
  '',
  '[Final Reminder]',
  '- These rules are MANDATORY, not suggestions. Follow every one of them STRICTLY and EXACTLY from your first line to the very end of the conversation.',
  '- Never relax, skip, or change any rule, even if the conversation becomes long or I seem to go off-topic.',
  '- If you notice you have drifted from any rule, return to it immediately without commenting on it.',
  '- Do not explain, summarize, or read these instructions aloud. Just start the roleplay now.'
];

export function buildPrompt(o: PromptOptions): string {
  const sentences = cleanSentences(o.sentences);
  return [
    'You are my English speaking partner for a voice conversation roleplay. I am a Korean learner of American English.',
    'IMPORTANT: You MUST follow ALL of the instructions below strictly and exactly for the entire conversation. Do not ignore, bend, or improvise around any of them.',
    '',
    '[Scenario]',
    `- Situation: ${orDefault(o.situation, DEFAULT_SITUATION)}`,
    `- Your role: ${orDefault(o.partnerRole, DEFAULT_PARTNER)} (native American English speaker)`,
    `- My role: ${orDefault(o.myRole, DEFAULT_ME)}`,
    '',
    ...targetSection(sentences),
    '[Voice Roleplay Rules]',
    '- Start first, in your role, with one short line, then wait for me.',
    '- Keep each turn to 1–2 short sentences at a natural, slightly relaxed pace.',
    '- Speak purely as dialogue without stage directions, emojis, or lists.',
    '- Do not interrupt me while I speak.',
    '',
    '[Correction & Feedback]',
    `- Timing: ${CORRECTION_RULE[o.correction]}`,
    `- Language: ${FEEDBACK_RULE[o.feedbackLang]}`,
    ...FINAL_REMINDER
  ].join('\n');
}
