import { IconBulb, IconPause, IconPlay, IconSkipNext } from '../../components/icons/icons';
import { MicButton } from '../../components/MicButton';
import micStyles from '../../components/MicButton.module.css';
import { ResultMark } from '../../components/ResultMark';
import dialogueStyles from '../dialogue/Dialogue.module.css';
import type { Turn } from './useRolePlaySession';

type Props = {
  myTurn: boolean; // 지금 줄이 내 줄. 아니면(상대 줄) 가운데 버튼은 멈춤/다시 시작
  turn: Turn;
  running: boolean; // 자동 진행 중(내 차례면 마이크 켜짐)
  echoing: boolean; // 상대 대사 다시 듣기 중: 마이크를 열지 않는다 (잡음 대책)
  micLocked: boolean;
  engineNote: string | null;
  showExample: boolean;
  onToggleExample: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
};

// 가운데 버튼 아래 영문 라벨 (버튼 글자는 디자인대로 영문 — PLAN 7.95 기본값)
function statusLabel(p: Props): string {
  if (p.echoing || (!p.myTurn && p.running)) return 'Partner speaking';
  if (!p.myTurn) return 'Tap to resume';
  if (!p.running) return 'Tap to answer';
  if (p.turn.last?.pass) return 'Pass';
  if (p.turn.preparing) return 'Get ready';
  return 'Listening…';
}

// 라벨 밑 한국어 안내: 듣는 중 요령, 인식 준비 같은 꼭 읽어야 할 말만
function hintText(p: Props): string | null {
  if (!p.running && p.micLocked && p.engineNote) return p.engineNote;
  if (p.myTurn && p.running && p.turn.preparing) return '마이크가 켜지면 말해 주세요';
  if (p.myTurn && p.running && !p.turn.last?.pass) return '다 말하고 잠깐 멈추면 판정해요';
  return null;
}

function Result({ last }: { last: Turn['last'] }) {
  if (!last) return null;
  if (last.pass) return <p className={`${dialogueStyles.result} ${dialogueStyles.pass}`} lang="ko"><ResultMark pass />통과!</p>;
  const missed = last.judgement.hits.filter((h) => !h.hit).map((h) => h.keyword);
  return (
    <p className={`${dialogueStyles.result} ${dialogueStyles.fail}`} lang="ko">
      <ResultMark pass={false} />{missed.length ? <>빠진 말: <span lang="en">{missed.join(', ')}</span> · 다시 말해 보세요</> : '잘 안 들렸어요. 다시 말해 보세요'}
    </p>
  );
}

// 롤플레이 아래쪽 (디자인 v2 07): 전구(예시 영어 보기) · 마이크 · 건너뛰기. 상대 줄에도 같은 자리에 두어
// 버튼 위치가 흔들리지 않게 한다. 내 차례 마이크는 자동으로 켜지고, 누르면 멈춤/다시 듣기
export function MyTurnPanel(p: Props) {
  const passed = p.turn.last?.pass === true;
  const hint = hintText(p);
  return (
    <div className={dialogueStyles.panel}>
      {p.myTurn && <Result last={p.turn.last} />}
      <div className={dialogueStyles.controls}>
        <button type="button" className={dialogueStyles.side} onClick={p.onToggleExample} disabled={!p.myTurn}
          aria-pressed={p.showExample} aria-label={p.showExample ? '예시 영어 숨기기' : '예시 영어 보기'}><IconBulb /></button>
        {p.myTurn
          ? <MicButton tone="label" listening={p.running && !passed && !p.turn.preparing} status={statusLabel(p)}
            disabled={passed || p.echoing || (!p.running && p.micLocked)} onClick={p.running ? p.onPause : p.onResume} />
          : <PlayToggle p={p} />}
        <button type="button" className={dialogueStyles.side} onClick={p.onSkip}
          disabled={!p.myTurn || passed || p.echoing} aria-label="이 줄 건너뛰기"><IconSkipNext /></button>
      </div>
      {hint && <p className={dialogueStyles.hint} lang="ko">{hint}</p>}
    </div>
  );
}

// 상대 줄을 듣는 동안: 멈춤 / 이 줄부터 다시. 마이크 버튼과 같은 모양·자리 (MicButton.module.css)
function PlayToggle({ p }: { p: Props }) {
  return (
    <div className={`${micStyles.wrap} ${micStyles.wrapLabel}`}>
      <button type="button" className={micStyles.mic} disabled={p.echoing || (!p.running && p.micLocked)}
        onClick={p.running ? p.onPause : p.onResume} aria-label={p.running ? '멈춤' : '여기서부터 다시'}>
        {p.running ? <IconPause /> : <IconPlay />}
      </button>
      <p className={micStyles.label} lang="en" aria-live="polite">{statusLabel(p)}</p>
    </div>
  );
}
