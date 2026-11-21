import { TapText } from '../../components/wordPicker/TapText';
import { judgeKeywords, markKeywords } from '../../scoring/keywordJudge';
import { snapToSentence } from '../../scoring/snapHeard';
import dialogueStyles from '../dialogue/Dialogue.module.css';
import { SpeakerTag } from '../dialogue/SpeakerTag';
import styles from './RolePlay.module.css';
import type { MyLine, Turn } from './useRolePlaySession';

type Props = { line: MyLine; turn: Turn; showExample: boolean };

// 내 줄은 정해진 문장이 없어(내 말로 대답) 들린 말을 큰 글씨로. 아직 말하기 전이면 null
function heardText(turn: Turn): string | null {
  return turn.live?.heard || turn.last?.judgement.heard || null;
}

// 롤플레이 ME 카드 (디자인 v2 07): ME + 키워드 칩(✓), 내가 한 말(키워드 강조).
// 예시 한국어는 처음부터, 예시 영어는 전구를 눌러야 보인다 (사용자 결정 2026-11-18)
export function MeCard({ line, turn, showExample }: Props) {
  const keys = line.requiredKeywords;
  const j = turn.live ?? turn.last?.judgement ?? judgeKeywords(keys, []);
  const heard = heardText(turn);
  return (
    <article className={`${dialogueStyles.card} ${dialogueStyles.cardMain} ${dialogueStyles.cardMe} ${styles.me}`}>
      <div className={styles.meTop}>
        <SpeakerTag me partnerRole="" />
        <ul className={styles.chips} aria-label="꼭 넣을 말">
          {j.hits.map((h) => (
            <li key={h.keyword} className={`${styles.chip} ${h.hit ? styles.hit : ''}`} lang="en">
              {h.hit ? '✓ ' : ''}{h.keyword}
            </li>
          ))}
        </ul>
      </div>
      {heard
        ? <Heard keywords={keys} text={heard} expected={line.exampleEn} snap={!(turn.last?.source === 'whisper' && !turn.live)} />
        : <p className={styles.prompt} lang="ko">{keys.length ? '꼭 넣을 말을 넣어 영어로 대답해 보세요' : '자유롭게 영어로 대답해 보세요'}</p>}
      <p className={dialogueStyles.cardKo} lang="ko">예: {line.exampleKo}</p>
      {showExample && (
        <p className={styles.example} lang="en">
          <TapText text={line.exampleEn} source={{ id: `roleplay-${line.no}`, en: line.exampleEn, ko: line.exampleKo }} />
        </p>
      )}
    </article>
  );
}

// 소리가 비슷해 예시 문장 단어로 맞춰 적은 말은 점선 밑줄로 구분한다 — 진짜 들린 글자와 섞이지 않게.
// 맞춰 적기는 한 단어 → 한 단어라 키워드 강조와 단어 번호가 같다.
// Whisper가 받아쓴 글자는 맞춰 적지 않는다(snap=false): 들린 그대로 보여 줘야 발음 피드백이 된다 (2026-11-21)
type HeardProps = { keywords: string[]; text: string; expected: string; snap: boolean };

function Heard({ keywords, text, expected, snap: on }: HeardProps) {
  const snap = on ? snapToSentence(text, expected) : text.split(/\s+/).filter(Boolean).map((t) => ({ text: t, snapped: false }));
  const marks = markKeywords(keywords, snap.map((s) => s.text).join(' '));
  return (
    <p className={styles.heard} lang="en">
      {marks.map((p, i) => {
        const word = snap[i]?.snapped ? <span className={styles.snapped}>{p.text}</span> : p.text;
        return <span key={i}>{p.key ? <strong className={styles.key}>{word}</strong> : word}{' '}</span>;
      })}
    </p>
  );
}
