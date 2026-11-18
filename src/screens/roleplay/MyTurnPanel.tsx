import { useState } from 'react';
import { Button } from '../../components/Button';
import { MicButton } from '../../components/MicButton';
import dialogueStyles from '../dialogue/Dialogue.module.css';
import styles from './RolePlay.module.css';
import type { MyLine, RpOutcome } from './useRolePlayAttempt';

type Props = {
  line: MyLine;
  outcome: RpOutcome;
  micLocked: boolean;
  engineNote: string | null;
  onStart: () => void;
  onStop: () => void;
  onSkip: () => void;
};

function statusText(p: Props): string {
  if (p.outcome.status === 'listening') return '듣는 중… 다 말하고 잠깐 멈추면 끝나요';
  if (p.outcome.message) return p.outcome.message;
  if (p.micLocked && p.engineNote) return p.engineNote;
  return '탭하고 내 말로 대답해 보세요';
}

function Keywords({ p }: { p: Props }) {
  if (!p.line.requiredKeywords.length) return <p className={styles.label} lang="ko">자유롭게 대답하면 통과예요</p>;
  return (
    <div>
      <p className={styles.label} lang="ko">꼭 넣을 말</p>
      <ul className={styles.keywords}>
        {p.outcome.judgement.hits.map((h) => (
          <li key={h.keyword} className={`${styles.chip} ${h.hit ? styles.hit : ''}`} lang="en">{h.keyword}</li>
        ))}
      </ul>
    </div>
  );
}

function Result({ p }: { p: Props }) {
  const { status, judgement } = p.outcome;
  const missed = judgement.hits.filter((h) => !h.hit).map((h) => h.keyword);
  return (
    <>
      {status === 'passed' && <p className={`${dialogueStyles.result} ${dialogueStyles.pass}`} lang="ko">통과!</p>}
      {status === 'failed' && (
        <p className={`${dialogueStyles.result} ${dialogueStyles.fail}`} lang="ko">
          {missed.length ? <>빠진 말: <span lang="en">{missed.join(', ')}</span></> : '잘 안 들렸어요. 다시 말해 보세요'}
        </p>
      )}
      {/* 자유 답변 인식이 아이폰에서 어떻게 되는지 보려고 들린 말은 늘 보여 준다 */}
      {judgement.heard && <p className={styles.heard} lang="ko">들린 말 <span lang="en">“{judgement.heard}”</span></p>}
    </>
  );
}

// 롤플레이 내 차례: 예시 한국어와 꼭 넣을 말은 처음부터, 예시 영어는 눌러야 보인다 (사용자 결정 2026-11-18)
export function MyTurnPanel(p: Props) {
  const [showExample, setShowExample] = useState(false);
  const listening = p.outcome.status === 'listening';
  const passed = p.outcome.status === 'passed';
  return (
    <div className={dialogueStyles.panel}>
      <p className={styles.hint} lang="ko">예: {p.line.exampleKo}</p>
      <Keywords p={p} />
      {showExample && <p className={styles.example} lang="en">{p.line.exampleEn}</p>}
      <Result p={p} />
      <MicButton listening={listening} status={statusText(p)}
        disabled={passed || (p.micLocked && !listening)} onClick={listening ? p.onStop : p.onStart} />
      <div className={dialogueStyles.actions}>
        <Button size="sm" onClick={() => setShowExample((v) => !v)}>{showExample ? '예시 숨기기' : '예시 보기'}</Button>
        <Button size="sm" variant="ghost" onClick={p.onSkip} disabled={listening || passed}>건너뛰기</Button>
      </div>
    </div>
  );
}
