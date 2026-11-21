import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ExportSheet } from '../components/ExportSheet';
import { IconExport, IconPlay, IconShuffle } from '../components/icons/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import styles from './library/Library.module.css';
import { vocabExportFormats } from './vocab/exportFormats';
import { useVocab } from './vocab/useVocab';
import vocabStyles from './vocab/Vocab.module.css';
import { VocabRow } from './vocab/VocabRow';

type Filter = 'known' | 'unknown';
type Side = 'right' | 'left';
type Opened = { id: number; side: Side } | null; // 밀려서 버튼이 열린 줄 (한 번에 하나만)

const isOpened = (cur: Opened, id: number, side: Side) => cur !== null && cur.id === id && cur.side === side;
// 열라는 요청이면 이 줄로 바꾸고, 닫으라는 요청이면 지금 열린 것이 이 줄·이 쪽일 때만 닫는다 (다른 줄의 열림을 닫지 않게)
const nextOpened = (cur: Opened, id: number, side: Side, open: boolean): Opened =>
  open ? { id, side } : isOpened(cur, id, side) ? null : cur;

// 디자인 v2 10 VOCAB: N WORDS · Vocab · 내보내기 아이콘, Random All · Unknown 시작 버튼,
// Known · Unknown 개수 박스(누르면 그 단어만 보임), 줄 목록
export function VocabScreen() {
  const { words, error, remove, edit, setKnown } = useVocab();
  const nav = useNavigate();
  const [opened, setOpened] = useState<Opened>(null);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportButton = words && words.length > 0 && (
    <button type="button" className={styles.iconBtn} onClick={() => setExporting(true)} aria-label="내보내기"><IconExport /></button>
  );
  const knownCount = words?.filter((w) => w.known).length ?? 0;
  const unknownCount = (words?.length ?? 0) - knownCount;
  const shown = words?.filter((w) => filter === null || !!w.known === (filter === 'known')) ?? [];
  const toggle = (f: Filter) => { setOpened(null); setFilter((cur) => (cur === f ? null : f)); };
  const box = (f: Filter, name: string, count: number) => (
    <button type="button" className={`${vocabStyles.box} ${filter === f ? vocabStyles.boxOn : ''}`} aria-pressed={filter === f} onClick={() => toggle(f)}>
      <span className={vocabStyles.boxNum}>{count}</span>
      <span className={vocabStyles.boxLabel} lang="en">{name}</span>
    </button>
  );
  return (
    <>
      <ScreenHeader eyebrow={`${words?.length ?? 0} WORDS`} title="Vocab" action={exportButton} />
      {error && <p className={styles.note} lang="ko">{error}</p>}
      {!words && !error && <p className={styles.note} lang="ko">불러오는 중…</p>}
      {words?.length === 0 && (
        <p className={styles.note} lang="ko">아직 저장한 단어가 없어요. 설명·대화문 화면에서 문장 속 단어를 누르면 여기에 모여요.</p>
      )}
      {words && words.length > 0 && (
        <>
          <div className={styles.pair}>
            <Button variant="primary" onClick={() => nav('/vocab/quiz?mode=card&scope=random')}><IconShuffle />Random All</Button>
            <Button onClick={() => nav('/vocab/quiz?mode=card&scope=unknown')}><IconPlay />Unknown</Button>
          </div>
          <div className={vocabStyles.boxes}>
            {box('known', 'KNOWN', knownCount)}
            {box('unknown', 'UNKNOWN', unknownCount)}
          </div>
          {shown.length === 0 && <p className={styles.note} lang="ko">{filter === 'known' ? '아직 Known 단어가 없어요.' : '모르는(Unknown) 단어가 없어요.'}</p>}
          <ul className={styles.list}>
            {shown.map((w) => (
              <VocabRow key={w.id} word={w} onRemove={(id) => { setOpened(null); remove(id); }} onEdit={edit}
                onSetKnown={(id, known) => { setOpened(null); setKnown(id, known); }}
                open={isOpened(opened, w.id!, 'right')} onOpenChange={(o) => setOpened((cur) => nextOpened(cur, w.id!, 'right', o))}
                leftOpen={isOpened(opened, w.id!, 'left')} onLeftOpenChange={(o) => setOpened((cur) => nextOpened(cur, w.id!, 'left', o))} />
            ))}
          </ul>
          <p className={styles.tip} lang="ko">왼쪽으로 밀면 뜻 고치기 · 삭제, 오른쪽으로 밀면 Know / Don&apos;t Know</p>
        </>
      )}
      {exporting && words && <ExportSheet title="단어장 내보내기" formats={vocabExportFormats(words)} onClose={() => setExporting(false)} />}
    </>
  );
}
