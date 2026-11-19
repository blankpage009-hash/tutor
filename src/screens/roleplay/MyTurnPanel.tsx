import { useState } from 'react';
import { Button } from '../../components/Button';
import { MicButton } from '../../components/MicButton';
import { judgeKeywords } from '../../scoring/keywordJudge';
import dialogueStyles from '../dialogue/Dialogue.module.css';
import styles from './RolePlay.module.css';
import type { MyLine, Turn } from './useRolePlaySession';

type Props = {
  line: MyLine;
  turn: Turn;
  running: boolean; // 자동 진행 중(마이크 켜짐)
  micLocked: boolean;
  engineNote: string | null;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
};

function statusText(p: Props): string {
  if (p.running && p.turn.last?.pass) return '통과! 다음으로 넘어가요';
  if (p.running && p.turn.preparing) return '마이크 준비 중… 잠깐만요';
  if (p.running) return '듣는 중… 다 말하고 잠깐 멈추면 판정해요. 탭하면 멈춰요';
  if (p.micLocked && p.engineNote) return p.engineNote;
  return '멈췄어요. 탭하면 이 줄부터 다시 들어요';
}

function Keywords({ p }: { p: Props }) {
  if (!p.line.requiredKeywords.length) return <p className={styles.label} lang="ko">자유롭게 대답하면 통과예요</p>;
  const j = p.turn.live ?? p.turn.last?.judgement ?? judgeKeywords(p.line.requiredKeywords, []);
  return (
    <div>
      <p className={styles.label} lang="ko">꼭 넣을 말</p>
      <ul className={styles.keywords}>
        {j.hits.map((h) => (
          <li key={h.keyword} className={`${styles.chip} ${h.hit ? styles.hit : ''}`} lang="en">{h.keyword}</li>
        ))}
      </ul>
    </div>
  );
}

function Result({ last }: { last: Turn['last'] }) {
  if (!last) return null;
  const missed = last.judgement.hits.filter((h) => !h.hit).map((h) => h.keyword);
  return (
    <>
      {last.pass
        ? <p className={`${dialogueStyles.result} ${dialogueStyles.pass}`} lang="ko">통과!</p>
        : (
          <p className={`${dialogueStyles.result} ${dialogueStyles.fail}`} lang="ko">
            {missed.length ? <>빠진 말: <span lang="en">{missed.join(', ')}</span> · 다시 말해 보세요</> : '잘 안 들렸어요. 다시 말해 보세요'}
          </p>
        )}
      {/* 자유 답변 인식이 어떻게 되는지 보려고 들린 말은 늘 보여 준다 */}
      {last.judgement.heard && <p className={styles.heard} lang="ko">들린 말 <span lang="en">“{last.judgement.heard}”</span></p>}
    </>
  );
}

// 롤플레이 내 차례: 예시 한국어와 꼭 넣을 말은 처음부터, 예시 영어는 눌러야 보인다 (사용자 결정 2026-11-18).
// 마이크는 자동으로 켜져 있고, 버튼은 멈춤/다시 듣기
export function MyTurnPanel(p: Props) {
  const [showExample, setShowExample] = useState(false);
  const passed = p.turn.last?.pass === true;
  return (
    <div className={dialogueStyles.panel}>
      <p className={styles.hint} lang="ko">예: {p.line.exampleKo}</p>
      <Keywords p={p} />
      {showExample && <p className={styles.example} lang="en">{p.line.exampleEn}</p>}
      <Result last={p.turn.last} />
      <MicButton listening={p.running && !passed && !p.turn.preparing} status={statusText(p)}
        disabled={passed || (!p.running && p.micLocked)} onClick={p.running ? p.onPause : p.onResume} />
      <div className={dialogueStyles.actions}>
        <Button size="sm" onClick={() => setShowExample((v) => !v)}>{showExample ? '예시 숨기기' : '예시 보기'}</Button>
        <Button size="sm" variant="ghost" onClick={p.onSkip} disabled={passed}>건너뛰기</Button>
      </div>
    </div>
  );
}
