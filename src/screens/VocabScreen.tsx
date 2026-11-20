import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ExportSheet } from '../components/ExportSheet';
import { IconExport, IconPlay, IconShuffle } from '../components/icons/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import styles from './library/Library.module.css';
import { vocabExportFormats } from './vocab/exportFormats';
import { useDueWordCount, useVocab } from './vocab/useVocab';
import { VocabRow } from './vocab/VocabRow';

// 디자인 v2 10 VOCAB: N WORDS · Vocab · 내보내기 아이콘, Quiz · 오늘 복습할 단어 수 · Random, 줄 목록
export function VocabScreen() {
  const { words, error, remove, edit } = useVocab();
  const due = useDueWordCount();
  const nav = useNavigate();
  const [openId, setOpenId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportButton = words && words.length > 0 && (
    <button type="button" className={styles.iconBtn} onClick={() => setExporting(true)} aria-label="내보내기"><IconExport /></button>
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
            <Button variant="primary" onClick={() => nav('/vocab/quiz?mode=card&scope=due')}><IconPlay />{due ? `Quiz · ${due}` : 'Quiz'}</Button>
            <Button onClick={() => nav('/vocab/quiz?mode=card&scope=random')}><IconShuffle />Random</Button>
          </div>
          <ul className={styles.list}>
            {words.map((w) => (
              <VocabRow key={w.id} word={w} onRemove={(id) => { setOpenId(null); remove(id); }} onEdit={edit}
                open={openId === w.id} onOpenChange={(o) => setOpenId(o ? w.id! : null)} />
            ))}
          </ul>
          <p className={styles.tip} lang="ko">왼쪽으로 밀면 뜻 고치기 · 삭제</p>
        </>
      )}
      {exporting && words && <ExportSheet title="단어장 내보내기" formats={vocabExportFormats(words)} onClose={() => setExporting(false)} />}
    </>
  );
}
