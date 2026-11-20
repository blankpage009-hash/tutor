import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ExportSheet } from '../components/ExportSheet';
import { IconExport, IconHeadphones, IconShuffle } from '../components/icons/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { dueLabel } from '../dueLabel';
import { savedExportFormats } from './library/exportFormats';
import styles from './library/Library.module.css';
import { LibraryRow } from './library/LibraryRow';
import { useLibrary } from './library/useLibrary';
import { useSelection } from './library/useSelection';

// 위 버튼 두 개: 평소 Shadow All · Random, 고르는 중 Shadow Selected · Cancel
function TopButtons({ sel }: { sel: ReturnType<typeof useSelection> }) {
  const nav = useNavigate();
  if (sel.selecting) {
    return (
      <div className={styles.pair}>
        <Button variant="primary" disabled={sel.ids.length === 0} onClick={() => nav(sel.practicePath())}><IconHeadphones />{`Shadow · ${sel.ids.length}`}</Button>
        <Button onClick={sel.cancel}>Cancel</Button>
      </div>
    );
  }
  return (
    <div className={styles.pair}>
      <Button variant="primary" onClick={() => nav('/library/practice/all')}><IconHeadphones />Shadow All</Button>
      <Button onClick={() => nav('/review?mode=random')}><IconShuffle />Random</Button>
    </div>
  );
}

// 디자인 v2 09 LIBRARY: N SENTENCES · Library · 내보내기 아이콘, Shadow All · Random, 줄 목록
export function LibraryScreen() {
  const { rows, error, remove, dueAt } = useLibrary();
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const sel = useSelection(rows?.map((r) => r.id) ?? []);
  const now = Date.now();
  const removeRow = (id: string) => { setOpenId(null); remove(id); };
  const exportButton = rows && rows.length > 0 && (
    <button type="button" className={styles.iconBtn} onClick={() => setExporting(true)} aria-label="내보내기"><IconExport /></button>
  );
  return (
    <>
      <ScreenHeader eyebrow={sel.selecting ? `${sel.ids.length} SELECTED` : `${rows?.length ?? 0} SENTENCES`} title="Library" action={exportButton} />
      {error && <p className={styles.note} lang="ko">{error}</p>}
      {!rows && !error && <p className={styles.note} lang="ko">불러오는 중…</p>}
      {rows?.length === 0 && (
        <p className={styles.note} lang="ko">아직 저장한 문장이 없어요. 레슨이나 드릴에서 북마크를 누르면 여기에 모여요.</p>
      )}
      {rows && rows.length > 0 && (
        <>
          <TopButtons sel={sel} />
          <ul className={styles.list}>
            {rows.map((r) => (
              <LibraryRow key={r.id} row={r} due={dueLabel(dueAt.get(r.id), now)} onRemove={removeRow}
                open={openId === r.id} onOpenChange={(o) => setOpenId(o ? r.id : null)}
                selecting={sel.selecting} selected={sel.has(r.id)} onSelect={(id) => { setOpenId(null); sel.toggle(id); }} />
            ))}
          </ul>
          <p className={styles.tip} lang="ko">
            {sel.selecting ? '문장을 눌러 고르거나 풀어요.' : '줄을 누르면 그 문장부터 쉐도잉 · 왼쪽으로 밀면 삭제 · 길게 누르면 여러 문장 고르기'}
          </p>
        </>
      )}
      {exporting && rows && <ExportSheet title="보관함 내보내기" formats={savedExportFormats(rows)} onClose={() => setExporting(false)} />}
    </>
  );
}
