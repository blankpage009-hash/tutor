import type { DialogueLine } from '../../content/lessonTypes';
import { TapText } from '../../components/wordPicker/TapText';
import { SaveLineButton } from './SaveLineButton';
import { SpeakerTag } from './SpeakerTag';
import type { DialogueSaved } from './useDialogueSaved';
import styles from './Dialogue.module.css';

type Props = {
  lessonId: string; // 단어를 저장할 때 출처 문장을 가리키는 이름에 쓴다
  lines: DialogueLine[];
  partnerRole: string;
  current: number | null; // 지금 재생 중인 줄
  save: DialogueSaved;
};

// 처음·끝에 보이는 대화문 전체: 줄마다 선 카드 + 이름표 + 북마크. 재생 중인 줄은 파란 테두리
export function DialogueLines({ lessonId, lines, partnerRole, current, save }: Props) {
  return (
    <ol className={styles.lines}>
      {lines.map((l, i) => (
        <li key={l.no} className={`${styles.line} ${i === current ? styles.current : ''}`} aria-current={i === current}>
          <div className={styles.lineTop}>
            <SpeakerTag me={l.speaker === 'me'} partnerRole={partnerRole} />
            <SaveLineButton saved={save.isSaved(l)} onToggle={() => { void save.toggle(l); }} />
          </div>
          <p className={styles.en} lang="en">
            <TapText text={l.en} source={{ id: `${lessonId}-dlg${l.no}`, en: l.en, ko: l.ko }} />
          </p>
          <p className={styles.ko} lang="ko">{l.ko}</p>
        </li>
      ))}
    </ol>
  );
}
