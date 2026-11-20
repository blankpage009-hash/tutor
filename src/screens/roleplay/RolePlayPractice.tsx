import { useState } from 'react';
import type { RolePlayLine } from '../../content/lessonTypes';
import { MeCard } from './MeCard';
import { MyTurnPanel } from './MyTurnPanel';
import { RolePlayCard } from './RolePlayCard';
import { SituationCard } from './SituationCard';
import type { useRolePlaySession } from './useRolePlaySession';

type Props = {
  rp: { situation: string; partnerRole: string; lines: RolePlayLine[] };
  s: ReturnType<typeof useRolePlaySession>;
};

// 롤플레이 연습 화면 (디자인 v2 07): SITUATION, 상대 카드, (내 차례면) ME 카드, 아래 전구·마이크·건너뛰기.
// 내 차례에는 바로 앞 상대 대사를 그대로 보여 줘서 무엇에 대답하는지 보이게 한다
export function RolePlayPractice({ rp, s }: Props) {
  const line = rp.lines[s.cur];
  // 예시 영어 보기는 줄마다 처음엔 감춘다 (key로 줄이 바뀌면 새로 시작)
  return line ? <PracticeLine key={s.cur} rp={rp} s={s} line={line} /> : null;
}

function PracticeLine({ rp, s, line }: Props & { line: RolePlayLine }) {
  const [showExample, setShowExample] = useState(false);
  const myTurn = line.speaker === 'me';
  const partnerIdx = myTurn ? s.cur - 1 : s.cur;
  const partner = rp.lines[partnerIdx];
  const echoing = s.echo !== null;
  // 상대 줄이 재생되는 동안에는 다시 듣기를 잠근다 (같은 소리가 겹친다)
  const replayOff = echoing || (s.running && !myTurn);
  return (
    <>
      <SituationCard text={rp.situation} />
      {partner?.speaker === 'partner' && (
        <RolePlayCard key={partnerIdx} line={partner} partnerRole={rp.partnerRole} current={!myTurn}
          onReplay={partner.audio ? () => { void s.replay(partnerIdx); } : undefined} replayDisabled={replayOff} />
      )}
      {line.speaker === 'me' && <MeCard line={line} turn={s.turn} showExample={showExample} />}
      <MyTurnPanel myTurn={myTurn} turn={s.turn} running={s.running} echoing={echoing}
        micLocked={s.micLocked} engineNote={s.engineNote} showExample={showExample}
        onToggleExample={() => setShowExample((v) => !v)}
        onPause={s.stop} onResume={() => s.start(s.cur)} onSkip={s.skip} />
    </>
  );
}
