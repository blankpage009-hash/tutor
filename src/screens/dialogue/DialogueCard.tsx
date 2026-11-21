import type { DialogueLine } from '../../content/lessonTypes';
import { IconPlay } from '../../components/icons/icons';
import { WordHighlight } from '../../components/WordHighlight';
import { TapText } from '../../components/wordPicker/TapText';
import type { useShadowingAttempt } from '../shadowing/useShadowingAttempt';
import { SpeakerTag } from './SpeakerTag';
import styles from './Dialogue.module.css';

type Outcome = ReturnType<typeof useShadowingAttempt>['outcome'];

type Props = {
  lessonId: string; // 단어 저장 때 출처 문장 이름에 쓴다
  line: DialogueLine;
  partnerRole: string;
  dim?: boolean; // 바로 앞 줄: 흐리고 작게 (내 줄을 말할 때 무슨 말에 답하는지 보이게)
  outcome?: Outcome; // 내 차례일 때만: 말한 결과를 영어 문장 자리에 색칠해 보여 준다
  onReplay?: () => void; // 상대 줄만: 그 줄 다시 듣기. 내 줄 듣기는 아래 다시하기 버튼이 맡는다
  replayDisabled?: boolean;
};

// Speak 연습 중 한 줄 카드 (디자인 v2 05): 이름표 + ▶, 영어(또는 말한 결과), 한글
export function DialogueCard({ lessonId, line, partnerRole, dim, outcome, onReplay, replayDisabled }: Props) {
  const me = line.speaker === 'me';
  const final = outcome?.status === 'passed' || outcome?.status === 'failed';
  const cls = [styles.card, styles.cardCenter, me && styles.cardMe, dim ? styles.cardDim : styles.cardMain].filter(Boolean).join(' ');
  return (
    <article className={cls}>
      <div className={styles.cardTop}>
        <SpeakerTag me={me} partnerRole={partnerRole} />
        {onReplay && (
          <button type="button" className={styles.replay} onClick={onReplay} disabled={replayDisabled}
            aria-label={`${partnerRole} 대사 다시 듣기`}>
            <IconPlay />
          </button>
        )}
      </div>
      {outcome
        ? <WordHighlight words={outcome.judgement.words} nextIndex={outcome.judgement.nextIndex} final={final} />
        : (
          <p className={styles.cardEn} lang="en">
            <TapText text={line.en} source={{ id: `${lessonId}-dlg${line.no}`, en: line.en, ko: line.ko }} />
          </p>
        )}
      <p className={styles.cardKo} lang="ko">{line.ko}</p>
    </article>
  );
}
