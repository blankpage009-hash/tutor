import type { RolePlayLine } from '../../content/lessonTypes';
import styles from '../dialogue/Dialogue.module.css';

type Props = {
  lines: RolePlayLine[];
  partnerRole: string;
  upTo: number; // 이 줄까지만 보인다 (아직 오지 않은 대사는 미리 보여 주지 않는다)
  current: number | null;
  said: Record<number, string>; // 내 줄 번호 → 들린 말 (건너뛰면 없음)
};

function myText(said: Record<number, string>, no: number, isCurrent: boolean): string {
  if (said[no] !== undefined) return said[no] || '(건너뜀)';
  return isCurrent ? '내 차례예요…' : '(건너뜀)';
}

// 지금까지의 롤플레이 대화: 상대 줄은 대본, 내 줄은 내가 한 말
export function RolePlayLines({ lines, partnerRole, upTo, current, said }: Props) {
  return (
    <ol className={styles.lines}>
      {lines.slice(0, upTo + 1).map((l, i) => {
        const cls = [styles.line, l.speaker === 'me' ? styles.me : styles.partner, i === current && styles.current]
          .filter(Boolean).join(' ');
        return (
          <li key={l.no} className={cls} aria-current={i === current}>
            <span className={styles.who} lang="ko">{l.speaker === 'me' ? '나' : partnerRole}</span>
            {l.speaker === 'partner'
              ? <><p className={styles.en} lang="en">{l.en}</p><p className={styles.ko} lang="ko">{l.ko}</p></>
              : <p className={styles.en} lang="en">{myText(said, l.no, i === current)}</p>}
          </li>
        );
      })}
    </ol>
  );
}
