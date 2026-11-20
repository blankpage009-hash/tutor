import type { CurriculumUnit } from '../../content/lessonTypes';
import type { ProgressMap } from '../../lessonFlow';
import { summarizeUnit } from '../../levelProgress';
import { LessonRow } from './LessonRow';
import styles from './UnitRow.module.css';
import { UnitCells } from './UnitCells';

type Props = {
  unit: CurriculumUnit;
  progress: ProgressMap;
  open: boolean;
  current: boolean; // 지금 하고 있는 유닛(파란 테두리)
  onToggle: () => void;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

// 유닛 한 줄. 누르면 그 자리에서 레슨 목록이 펼쳐진다. 만든 레슨이 하나도 없으면 SOON으로 누를 수 없다
export function UnitRow({ unit, progress, open, current, onToggle }: Props) {
  const s = summarizeUnit(unit, progress);
  const soon = s.ready === 0;
  const body = (
    <>
      <span className={styles.text}>
        <span className={current ? `${styles.code} ${styles.accent}` : styles.code}>U{pad2(unit.no)}</span>
        <span className={styles.title} lang="ko">{unit.title}</span>
      </span>
      <span className={styles.right}>
        <UnitCells cells={s.cells} />
        <span className={soon ? `${styles.count} ${styles.soonLabel}` : styles.count}>
          {soon ? 'SOON' : `${s.done} / ${s.ready}`}
        </span>
      </span>
    </>
  );
  const cls = `${styles.unit} ${current ? styles.current : ''} ${soon ? styles.muted : ''}`;
  return (
    <li className={cls}>
      {soon
        ? <div className={styles.head} aria-disabled="true">{body}</div>
        : <button type="button" className={styles.head} aria-expanded={open} onClick={onToggle}>{body}</button>}
      {open && (
        <ul className={styles.lessons}>
          {unit.lessons.map((l) => <LessonRow key={l.no} lesson={l} progress={progress} />)}
        </ul>
      )}
    </li>
  );
}
