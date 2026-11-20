import type { NewLesson } from '../../content/lessonTypes';
import type { DialoguePracticeState } from '../DialogueScreen';
import type { useNewSpeaking } from '../newLesson/useNewSpeaking';
import { DialogueCard } from './DialogueCard';
import { MyLinePanel } from './MyLinePanel';
import styles from './Dialogue.module.css';

type Props = {
  lesson: NewLesson;
  d: DialoguePracticeState;
  speaking: ReturnType<typeof useNewSpeaking>;
  myTurn: boolean;
  busy: boolean; // 상대 줄 재생 또는 다시 듣기 중
  threshold: number;
  onSkip: () => void;
};

// Speak 연습 화면 (디자인 v2 05): LINE n / m, 바로 앞 줄(흐리게) + 지금 줄 카드, 아래 다시하기·마이크·건너뛰기
export function DialoguePractice({ lesson, d, speaking, myTurn, busy, threshold, onSkip }: Props) {
  const role = lesson.dialogue.partnerRole;
  const shown = d.player.playing ?? d.cur;
  if (shown >= d.lines.length) return null;
  const prev = shown > 0 ? d.lines[shown - 1] : null;
  // 듣는 중에 다시 듣기를 틀면 마이크가 내 줄 대신 상대 소리를 듣는다. 마이크를 먼저 멈추게 잠근다
  const replayOff = busy || speaking.attempt.outcome?.status === 'listening';
  const replayOf = (i: number) => (d.lines[i].speaker === 'partner' ? () => { void d.player.replay(i); } : undefined);
  return (
    <>
      <div className={styles.where}>
        <span>Line {shown + 1} / {d.lines.length}</span>
        <span lang="ko">{role} ↔ ME</span>
      </div>
      {prev && <DialogueCard dim lessonId={lesson.lessonId} line={prev} partnerRole={role}
        onReplay={replayOf(shown - 1)} replayDisabled={replayOff} />}
      {/* key가 바뀔 때마다 새 카드가 아래에서 올라오게 */}
      <DialogueCard key={shown} lessonId={lesson.lessonId} line={d.lines[shown]} partnerRole={role}
        outcome={myTurn ? speaking.attempt.outcome : undefined} onReplay={replayOf(shown)} replayDisabled={replayOff} />
      {/* 상대 줄에도 같은 패널을 (잠근 채) 두어 버튼 위치가 내 차례와 똑같게 */}
      <MyLinePanel attempt={speaking.attempt} threshold={threshold} engineNote={speaking.engineNote}
        micLocked={speaking.micLocked} waiting={!myTurn} onSkip={onSkip} />
    </>
  );
}
