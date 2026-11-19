// 외부 음성모드(Gemini·ChatGPT)에 붙여넣을 연습 프롬프트를 템플릿으로 조립하는 순수 모듈.
// 붙여넣는 상대가 영어 모델이라 지시문은 영어로 쓴다. 키 없이도 동작해야 하므로 AI 호출은 쓰지 않는다.

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
const DEFAULT_PARTNER = 'a friendly native American English speaker';
const DEFAULT_ME = 'myself';

const CORRECTION_RULE: Record<Correction, string> = {
  now: 'If I make a mistake, correct me right away: say the corrected sentence once, let me repeat it, then continue the conversation.',
  later: 'Do not interrupt me while I speak. After the conversation ends, list my mistakes and give a corrected version of each.'
};

const FEEDBACK_RULE: Record<FeedbackLang, string> = {
  en: 'Give all feedback and explanations in simple English.',
  ko: 'Give feedback and explanations in Korean, but keep the example sentences in English.'
};

function orDefault(value: string, fallback: string): string {
  const v = value.trim();
  return v || fallback;
}

export function cleanSentences(raw: string[]): string[] {
  return raw.map((s) => s.trim()).filter(Boolean);
}

export function buildPrompt(o: PromptOptions): string {
  const sentences = cleanSentences(o.sentences);
  const lines = [
    'You are my English speaking partner for a voice conversation practice. I am a Korean learner of American English.',
    '',
    `Situation: ${orDefault(o.situation, DEFAULT_SITUATION)}`,
    `Your role: ${orDefault(o.partnerRole, DEFAULT_PARTNER)}`,
    `My role: ${orDefault(o.myRole, DEFAULT_ME)}`
  ];
  if (sentences.length) {
    lines.push('', 'Target sentences I want to use naturally during our conversation:');
    sentences.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  lines.push('', 'How to run the practice:',
    '- Speak first, in your role, with one short line. Then wait for me.',
    '- Keep each turn to one or two short sentences, at a natural but not too fast pace.');
  if (sentences.length) {
    lines.push(
      '- Steer the conversation so I get a chance to use every target sentence. Do not say the target sentences for me.',
      '- When I have used all of them, wrap up and tell me which ones I missed or said unnaturally.');
  }
  lines.push(`- ${CORRECTION_RULE[o.correction]}`, `- ${FEEDBACK_RULE[o.feedbackLang]}`);
  return lines.join('\n');
}
