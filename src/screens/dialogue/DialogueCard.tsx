import type { MouseEvent } from 'react';
import type { DialogueLine } from '../../content/lessonTypes';
import { IconPlay } from '../../components/icons/icons';
import { WordHighlight } from '../../components/WordHighlight';
import { TapText } from '../../components/wordPicker/TapText';
import type { useShadowingAttempt } from '../shadowing/useShadowingAttempt';
import { SaveLineButton } from './SaveLineButton';
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
  saved: boolean;
  onSave: () => void;
  onTap: () => void; // 카드를 누르면 줄 이동 (앞 줄 카드 = 이전 줄, 지금 카드 = 다음 줄. 사용자 요청 2026-11-21)
};

// 카드 안의 버튼(단어·저장·다시 듣기)을 누른 것은 줄 이동으로 치지 않는다
function tapOutsideButtons(e: MouseEvent, go: () => void) {
  if ((e.target as Element).closest('button')) return;
  go();
}

// Speak 연습 중 한 줄 카드 (디자인 v2 05): 이름표 + ▶·북마크, 영어(또는 말한 결과), 한글
export function DialogueCard({ lessonId, line, partnerRole, dim, outcome, onReplay, replayDisabled, saved, onSave, onTap }: Props) {
  const me = line.speaker === 'me';
  const final = outcome?.status === 'passed' || outcome?.status === 'failed';
  const cls = [styles.card, styles.cardCenter, styles.cardTap, me && styles.cardMe, dim ? styles.cardDim : styles.cardMain].filter(Boolean).join(' ');
  return (
    <article className={cls} onClick={(e) => tapOutsideButtons(e, onTap)}>
      <div className={styles.cardTop}>
        <SpeakerTag me={me} partnerRole={partnerRole} />
        <div className={styles.cardTools}>
          {onReplay && (
            <button type="button" className={styles.replay} onClick={onReplay} disabled={replayDisabled}
              aria-label={`${partnerRole} 대사 다시 듣기`}>
              <IconPlay />
            </button>
          )}
          <SaveLineButton saved={saved} onToggle={onSave} />
        </div>
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
