import { IconBookmark } from '../../components/icons/icons';
import { ResultMark } from '../../components/ResultMark';
import { WordHighlight } from '../../components/WordHighlight';
import { usePickWord } from '../../components/wordPicker/WordPicker';
import type { DrillStep } from '../../drillPlan';
import type { useShadowingAttempt } from '../shadowing/useShadowingAttempt';
import styles from './DrillPlayer.module.css';

type Outcome = ReturnType<typeof useShadowingAttempt>['outcome'];

type Props = {
  step: DrillStep;
  outcome: Outcome;
  saved: boolean;
  onSave?: () => void; // 없으면(보관함 연습: 이미 보관함에 있는 문장) 잠긴 채 "저장됨"으로만 보여 준다
};

// 드릴 카드 한 장 (디자인 v2 06): 포인트 태그 + 북마크, 큰 문장(맞힌 단어 색칠), 결과 PASS · 96%
export function DrillCard({ step, outcome, saved, onSave }: Props) {
  return (
    <>
      <div className={styles.cardTop}>
        {/* 보관함 연습 문장은 포인트가 없어 빈 자리만 둔다 (북마크가 오른쪽에 붙어 있게) */}
        {step.drill.point ? <span className={styles.tag} lang="ko">{step.drill.point}</span> : <span />}
        {/* 누를 때마다 저장 ↔ 해제 (사용자 요청 2026-11-20) */}
        <button type="button" className={styles.save} onClick={onSave} disabled={!onSave} aria-pressed={saved}
          aria-label={!onSave ? '저장됨' : saved ? '저장 해제' : '문장 저장'}><IconBookmark filled={saved} /></button>
      </div>
      <div className={styles.body}>
        <Sentence step={step} outcome={outcome} />
        <Result outcome={outcome} />
      </div>
    </>
  );
}

// 기억·상황 응답 회차는 통과하기 전까지 영어 정답을 감춘다 (사용자 결정 2026-11-17: 정답은 3번째 실패에만)
function Sentence({ step, outcome: o }: { step: DrillStep; outcome: Outcome }) {
  const { show } = step.stage;
  const showEn = show === 'en+ko' || show === 'en' || o?.status === 'passed';
  const final = o?.status === 'passed' || o?.status === 'failed';
  const pick = usePickWord();
  const source = { id: step.saveId, en: step.drill.en, ko: step.drill.ko };
  const onWordTap = pick ? (w: string) => pick(w, source) : undefined;
  return (
    <>
      {show === 'cue' && <p className={styles.cue} lang={step.drill.cue.lang}>{step.drill.cue.text}</p>}
      {o && showEn && <WordHighlight words={o.judgement.words} nextIndex={o.judgement.nextIndex} final={final} onWordTap={onWordTap} />}
      {!showEn && <p className={styles.hidden} lang="ko">영어로 말해 보세요</p>}
      {(show === 'en+ko' || show === 'ko') && <p className={styles.ko} lang="ko">{step.drill.ko}</p>}
    </>
  );
}

// 결과는 시안처럼 영문 대문자 한 줄. 틀렸을 때만 들린 말을 한국어 안내로 덧붙인다
function Result({ outcome: o }: { outcome: Outcome }) {
  if (!o || (o.status !== 'passed' && o.status !== 'failed')) return null;
  const pct = Math.round(o.judgement.ratio * 100);
  if (o.status === 'passed') return <p className={`${styles.result} ${styles.pass}`}><ResultMark pass />Pass · {pct}%</p>;
  return (
    <div className={styles.failBox}>
      <p className={`${styles.result} ${styles.fail}`}><ResultMark pass={false} />Try again · {pct}%</p>
      {o.judgement.heard && <p className={styles.heard} lang="ko">들린 말 <span lang="en">“{o.judgement.heard}”</span></p>}
    </div>
  );
}
