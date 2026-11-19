import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { ExportBar } from './library/ExportBar';
import styles from './library/Library.module.css';
import { LibraryRow } from './library/LibraryRow';
import { useLibrary } from './library/useLibrary';

export function LibraryScreen() {
  const { rows, error, remove } = useLibrary();
  const nav = useNavigate();
  return (
    <>
      <ScreenHeader eyebrow="보관함" title="저장한 문장" />
      {error && <p className={styles.note} lang="ko">{error}</p>}
      {!rows && !error && <p className={styles.note} lang="ko">불러오는 중…</p>}
      {rows?.length === 0 && (
        <p className={styles.note} lang="ko">아직 저장한 문장이 없어요. 수업이나 드릴에서 “문장 저장”을 누르면 여기에 모여요.</p>
      )}
      {rows && rows.length > 0 && (
        <>
          <p className={styles.note} lang="ko">{rows.length}개 · 최근에 저장한 문장이 위에 있어요</p>
          <Button variant="primary" block onClick={() => nav('/library/practice/all')}>전부 쉐도잉 연습</Button>
          <ul className={styles.list}>
            {rows.map((r) => <LibraryRow key={r.id} row={r} onRemove={remove} />)}
          </ul>
          <ExportBar rows={rows} />
        </>
      )}
    </>
  );
}
