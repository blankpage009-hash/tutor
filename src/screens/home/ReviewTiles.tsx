import { Link } from 'react-router-dom';
import { useDueCount } from '../review/useDueCount';
import { useDueWordCount } from '../vocab/useVocab';
import styles from './ReviewTiles.module.css';

type TileProps = { count: number | null; label: string; to: string };

// 복습할 게 있을 때만 눌러서 시작. 0개거나 아직 세는 중이면 그냥 칸만 보인다
function Tile({ count, label, to }: TileProps) {
  const body = (
    <>
      <span className={styles.count}>{count ?? '–'}</span>
      <span className={styles.label} lang="ko">{label}</span>
    </>
  );
  if (count && count > 0) {
    return <Link to={to} className={styles.tile} aria-label={`오늘 복습할 ${label} ${count}개 시작`}>{body}</Link>;
  }
  return <div className={`${styles.tile} ${styles.idle}`}>{body}</div>;
}

// 오늘 복습: 때가 된 저장 문장 수 → 복습, 단어 수 → 단어 퀴즈(때 된 단어)
export function ReviewTiles() {
  const sentences = useDueCount();
  const words = useDueWordCount();
  return (
    <section aria-labelledby="home-review">
      <div className={styles.head}>
        <h2 id="home-review" className={styles.title}>Review</h2>
        <span className={styles.today}>TODAY</span>
      </div>
      <div className={styles.grid}>
        <Tile count={sentences} label="문장" to="/review" />
        <Tile count={words} label="단어" to="/vocab/quiz?scope=due" />
      </div>
    </section>
  );
}
