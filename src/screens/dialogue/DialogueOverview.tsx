import { Button } from '../../components/Button';
import { IconChevronRight, IconMic, IconPlay, IconStop } from '../../components/icons/icons';
import type { NewLesson } from '../../content/lessonTypes';
import { DialogueLines } from './DialogueLines';
import type { useLinePlayer } from './useLinePlayer';
import styles from './Dialogue.module.css';

type Props = {
  lesson: NewLesson;
  phase: 'intro' | 'done';
  player: ReturnType<typeof useLinePlayer>;
  onStart: () => void;
  onNext: () => void;
};

// 처음(전체 듣기 → Speak)과 끝(표현 노트 → Next: Drill) 화면: 대화문 전체를 선 카드로 보여 준다
export function DialogueOverview({ lesson, phase, player, onStart, onNext }: Props) {
  const { dialogue } = lesson;
  const playing = player.playing !== null;
  return (
    <>
      <header className={styles.head}>
        <p className={styles.title} lang="ko">{lesson.lessonTitle}</p>
        <span className={styles.label}><span lang="ko">{dialogue.partnerRole}</span> ↔ ME · {dialogue.lines.length} Lines</span>
        <p className={styles.situation} lang="ko">{dialogue.situation}</p>
      </header>
      <DialogueLines lessonId={lesson.lessonId} lines={dialogue.lines} partnerRole={dialogue.partnerRole} current={player.playing} />
      {phase === 'intro'
        ? (
          <div className={styles.actions}>
            {playing
              ? <Button block onClick={player.stop}><IconStop />Stop</Button>
              : <Button block onClick={() => { void player.playAll(); }}><IconPlay />Listen</Button>}
            <Button variant="primary" block disabled={playing} onClick={onStart}><IconMic />Speak</Button>
          </div>
        )
        : <DoneNotes lesson={lesson} onAgain={onStart} onNext={onNext} />}
    </>
  );
}

function DoneNotes({ lesson, onAgain, onNext }: { lesson: NewLesson; onAgain: () => void; onNext: () => void }) {
  return (
    <>
      <p className={`${styles.result} ${styles.pass}`} lang="ko">대화문을 끝까지 했어요!</p>
      <section className={styles.box}>
        <span className={styles.label}>Expression Notes</span>
        <ul className={styles.notes}>
          {lesson.dialogue.expressionNotes.map((n) => (
            <li key={n.en}>
              <p className={styles.en} lang="en">{n.en}</p>
              <p className={styles.ko} lang="ko">{n.ko}</p>
            </li>
          ))}
        </ul>
      </section>
      <div className={styles.actions}>
        <Button variant="primary" block onClick={onNext}><IconChevronRight />Next: Drill</Button>
        <Button block onClick={onAgain}>Practice Again</Button>
      </div>
    </>
  );
}
