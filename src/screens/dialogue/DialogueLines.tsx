import type { DialogueLine } from '../../content/lessonTypes';
import { TapText } from '../../components/wordPicker/TapText';
import styles from './Dialogue.module.css';

type Props = {
  lessonId: string; // 단어를 저장할 때 출처 문장을 가리키는 이름에 쓴다
  lines: DialogueLine[];
  partnerRole: string;
  current: number | null; // 지금 재생 중이거나 내가 말할 줄
  upTo?: number; // 연습 중에는 아직 오지 않은 줄을 흐리게
};

// 대화문 6줄: 상대 줄은 왼쪽, 내 줄은 오른쪽 말풍선
export function DialogueLines({ lessonId, lines, partnerRole, current, upTo }: Props) {
  return (
    <ol className={styles.lines}>
      {lines.map((l, i) => {
        const cls = [
          styles.line, l.speaker === 'me' ? styles.me : styles.partner,
          i === current && styles.current, upTo !== undefined && i > upTo && styles.later
        ].filter(Boolean).join(' ');
        return (
          <li key={l.no} className={cls} aria-current={i === current}>
            <span className={styles.who} lang="ko">{l.speaker === 'me' ? '나' : partnerRole}</span>
            <p className={styles.en} lang="en">
              <TapText text={l.en} source={{ id: `${lessonId}-dlg${l.no}`, en: l.en, ko: l.ko }} />
            </p>
            <p className={styles.ko} lang="ko">{l.ko}</p>
          </li>
        );
      })}
    </ol>
  );
}
