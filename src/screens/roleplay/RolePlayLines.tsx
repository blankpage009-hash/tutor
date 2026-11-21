import { TapText } from '../../components/wordPicker/TapText';
import type { RolePlayLine } from '../../content/lessonTypes';
import dialogueStyles from '../dialogue/Dialogue.module.css';
import { SpeakerTag } from '../dialogue/SpeakerTag';

type Props = {
  lines: RolePlayLine[];
  partnerRole: string;
  said: Record<number, string>; // 내 줄 번호 → 들린 말 (건너뛰면 빈 글자)
};

// 끝 화면의 롤플레이 대화 전체: 상대 줄은 대본, 내 줄은 내가 한 말. 대화문 끝 화면과 같은 선 카드 모양
export function RolePlayLines({ lines, partnerRole, said }: Props) {
  return (
    <ol className={dialogueStyles.lines}>
      {lines.map((l) => (
        <li key={l.no} className={dialogueStyles.line}>
          <SpeakerTag me={l.speaker === 'me'} partnerRole={partnerRole} />
          {l.speaker === 'partner'
            ? <>
              <p className={dialogueStyles.en} lang="en"><TapText text={l.en} source={{ id: `roleplay-${l.no}`, en: l.en, ko: l.ko }} /></p>
              <p className={dialogueStyles.ko} lang="ko">{l.ko}</p>
            </>
            : <p className={dialogueStyles.en} lang="en">{said[l.no] || <span lang="ko" className={dialogueStyles.ko}>(건너뜀)</span>}</p>}
        </li>
      ))}
    </ol>
  );
}
