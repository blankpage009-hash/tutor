import { IconPlay } from '../../components/icons/icons';
import type { RolePlayLine } from '../../content/lessonTypes';
import dialogueStyles from '../dialogue/Dialogue.module.css';
import { SpeakerTag } from '../dialogue/SpeakerTag';
import styles from './RolePlay.module.css';

type PartnerLine = Extract<RolePlayLine, { speaker: 'partner' }>;

type Props = {
  line: PartnerLine;
  partnerRole: string;
  current: boolean; // 지금 재생 중(또는 재생할) 줄이면 아래에서 올라오며 나타난다
  onReplay?: () => void; // 음성이 있는 줄만. Gemini가 만든 새 상황은 소리가 없어 버튼을 숨긴다
  replayDisabled: boolean;
};

// 롤플레이 상대 카드 (디자인 v2 07): 이름표 + ▶, 영어, 한글. 대화문 카드와 같은 모양
export function RolePlayCard({ line, partnerRole, current, onReplay, replayDisabled }: Props) {
  return (
    <article className={`${dialogueStyles.card} ${current ? dialogueStyles.cardMain : styles.still}`}>
      <div className={dialogueStyles.cardTop}>
        <SpeakerTag me={false} partnerRole={partnerRole} />
        {onReplay && (
          <button type="button" className={dialogueStyles.replay} onClick={onReplay} disabled={replayDisabled}
            aria-label={`${partnerRole} 대사 다시 듣기`}>
            <IconPlay />
          </button>
        )}
      </div>
      <p className={styles.partnerEn} lang="en">{line.en}</p>
      <p className={dialogueStyles.cardKo} lang="ko">{line.ko}</p>
    </article>
  );
}
