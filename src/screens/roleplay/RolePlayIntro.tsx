import { Button } from '../../components/Button';
import { IconPlay } from '../../components/icons/icons';
import dialogueStyles from '../dialogue/Dialogue.module.css';
import styles from './RolePlay.module.css';
import { SituationCard } from './SituationCard';

type Props = { situation: string; locked: boolean; note: string | null; onStart: () => void };

// 롤플레이 처음 화면: 상황 + 짧은 진행 안내 + 시작 버튼. 시작은 꼭 탭으로 —
// iOS는 탭한 순간 만든 오디오 장치에만 마이크 소리를 준다
export function RolePlayIntro({ situation, locked, note, onStart }: Props) {
  return (
    <>
      <SituationCard text={situation} />
      <p className={dialogueStyles.note} lang="ko">
        상대가 먼저 말해요. 내 차례가 되면 마이크가 저절로 켜져요. 예시를 참고해 내 말로 대답하고, 꼭 넣을 말이 모두 들어가면 통과예요.
      </p>
      {locked && note && <p className={dialogueStyles.note} lang="ko">{note}</p>}
      <Button variant="primary" block className={styles.bottom} disabled={locked} onClick={onStart}>
        <IconPlay />Start Role-play
      </Button>
    </>
  );
}
