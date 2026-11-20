import type { CellState } from '../../levelProgress';
import styles from './UnitCells.module.css';

// 유닛 줄 오른쪽의 레슨 진도 네모 (레슨 하나 = 네모 하나)
export function UnitCells({ cells }: { cells: CellState[] }) {
  return (
    <div className={styles.cells} aria-hidden="true">
      {cells.map((c, i) => <span key={i} className={`${styles.cell} ${styles[c]}`} />)}
    </div>
  );
}
