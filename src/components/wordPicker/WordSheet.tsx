import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { loadGlossary, lookupWord } from '../../content/glossary';
import { findWord, removeWord, saveWord } from '../../db/vocab';
import type { VocabWord } from '../../db/types';
import { POS_OPTIONS, posLabel } from '../../posLabels';
import { normalizeWord } from '../../wordTap';
import { Button } from '../Button';
import { IconClose } from '../icons/icons';
import type { WordSource } from './WordPicker';
import styles from './WordSheet.module.css';

type Props = { word: string; source: WordSource; onClose: () => void };

type Loaded = { saved: VocabWord | null; fromGlossary: boolean };

// 이만큼(px) 넘게 아래로 쓸어내리면 창을 닫는다. 덜 내리면 제자리로 돌아간다
const CLOSE_DISTANCE = 80;

// 창 위쪽(손잡이 바·제목줄)을 잡고 아래로 끌면 창이 따라 내려가다 닫힌다.
// 포인터 이벤트라 아이폰 터치와 데스크톱 마우스가 같이 된다. 버튼(X) 위에서 시작한 동작은 끌기로 치지 않는다
function useSheetDrag(onClose: () => void) {
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const end = (e: PointerEvent) => {
    if (start.current === null) return;
    const moved = e.clientY - start.current;
    start.current = null;
    setDragging(false);
    if (moved > CLOSE_DISTANCE) onClose();
    else setDy(0);
  };
  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;
      start.current = e.clientY;
      setDragging(true);
      // 손가락이 손잡이 밖으로 나가도 끝까지 따라가게 붙잡아 둔다
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent) => {
      if (start.current !== null) setDy(Math.max(0, e.clientY - start.current));
    },
    onPointerUp: end,
    onPointerCancel: () => { start.current = null; setDragging(false); setDy(0); },
  };
  const style = { transform: `translateY(${dy}px)`, transition: dragging ? 'none' : undefined };
  return { handlers, style };
}

// 단어 하나의 저장 상태: 불러오기·저장·빼기. 빼고 나면 사전 뜻을 다시 채워 바로 다시 저장할 수 있게 한다
function useWordEntry(key: string, source: WordSource, onClose: () => void) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [meaning, setMeaning] = useState('');
  const [pos, setPos] = useState('noun');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fill = async (saved: VocabWord | null) => {
    const hit = saved ? null : lookupWord(await loadGlossary(), key);
    setMeaning(hit?.ko ?? '');
    setPos(hit?.pos ?? 'noun');
    setLoaded({ saved, fromGlossary: Boolean(hit) });
  };

  useEffect(() => {
    let alive = true;
    findWord(key).then((saved) => (alive ? fill(saved ?? null) : undefined))
      .catch((e) => alive && setError(`단어장을 못 읽었어요: ${String(e)}`));
    return () => { alive = false; };
    // fill은 key만 쓰므로 key가 바뀔 때만 다시 읽는다
  }, [key]);

  const save = async () => {
    setError('');
    try {
      const row = await saveWord({ word: key, meaning: meaning.trim(), pos, sourceSentenceId: source.id, sourceEn: source.en, sourceKo: source.ko });
      if (!row) throw new Error('저장이 확인되지 않았어요');
      // 저장되면 문장 속 단어에 점선 밑줄이 생기는 것으로 알 수 있으니 창은 바로 닫는다
      onClose();
    } catch (e) {
      setError(`저장하지 못했어요: ${String(e)}`);
    }
  };

  const remove = async () => {
    const id = loaded?.saved?.id;
    if (id === undefined) return;
    setError('');
    try {
      await removeWord(id);
      await fill(null);
      setMessage('단어장에서 뺐어요.');
    } catch (e) {
      setError(`지우지 못했어요: ${String(e)}`);
    }
  };

  return { loaded, meaning, setMeaning, pos, setPos, message, error, save, remove };
}

// 단어를 눌렀을 때 아래에서 올라오는 저장 창 (2026-11-21 사용자 요청: 위 손잡이 바로 쓸어 닫기, 오른쪽 위 X, 저장 옆 빨간 삭제)
export function WordSheet({ word, source, onClose }: Props) {
  const key = normalizeWord(word);
  const w = useWordEntry(key, source, onClose);
  const drag = useSheetDrag(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saved = w.loaded?.saved ?? null;
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section className={styles.sheet} style={drag.style} role="dialog" aria-modal="true" aria-label="단어 저장"
        onClick={(e) => e.stopPropagation()}>
        <div className={styles.top} {...drag.handlers}>
          <span className={styles.grab} aria-hidden="true" />
          <div className={styles.titleRow}>
            <p className={styles.word} lang="en">{key}</p>
            <button type="button" className={styles.close} onClick={onClose} aria-label="닫기"><IconClose /></button>
          </div>
        </div>
        <div className={styles.source}>
          <p className={styles.sourceEn} lang="en">{source.en}</p>
          {source.ko && <p className={styles.sourceKo} lang="ko">{source.ko}</p>}
        </div>
        {!w.loaded && !w.error && <p className={styles.hint} lang="ko">불러오는 중…</p>}
        {saved && <SavedInfo saved={saved} />}
        {w.loaded && !saved && (
          <EditFields meaning={w.meaning} pos={w.pos} fromGlossary={w.loaded.fromGlossary} onMeaning={w.setMeaning} onPos={w.setPos} />
        )}
        {w.loaded && (
          <Actions key={saved ? 'saved' : 'new'} saved={Boolean(saved)} canSave={Boolean(w.meaning.trim())} onSave={w.save} onRemove={w.remove} />
        )}
        {w.message && <p className={styles.saved} lang="ko" role="status">{w.message}</p>}
        {w.error && <p className={styles.error} lang="ko">{w.error}</p>}
      </section>
    </div>
  );
}

function SavedInfo({ saved }: { saved: VocabWord }) {
  return (
    <>
      <p className={styles.saved} lang="ko"><b>{posLabel(saved.pos)}</b> · {saved.meaning}</p>
      <p className={styles.hint} lang="ko">이미 단어장에 있어요. 뜻은 단어장 화면에서 고칠 수 있어요.</p>
    </>
  );
}

type EditProps = {
  meaning: string; pos: string; fromGlossary: boolean;
  onMeaning: (v: string) => void; onPos: (v: string) => void;
};

function EditFields({ meaning, pos, fromGlossary, onMeaning, onPos }: EditProps) {
  return (
    <>
      <label className={styles.field}>
        <span className={styles.label} lang="ko">뜻</span>
        <input className={styles.input} lang="ko" value={meaning} onChange={(e) => onMeaning(e.target.value)}
          placeholder="뜻을 적어 주세요" autoComplete="off" />
      </label>
      <p className={styles.hint} lang="ko">
        {fromGlossary ? '사전에서 채웠어요. 고쳐서 저장해도 돼요.' : '사전에 없는 단어예요. 뜻을 직접 적어 주세요.'}
      </p>
      <label className={styles.field}>
        <span className={styles.label} lang="ko">품사</span>
        <select className={styles.input} lang="ko" value={pos} onChange={(e) => onPos(e.target.value)}>
          {POS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    </>
  );
}

type ActionsProps = { saved: boolean; canSave: boolean; onSave: () => void; onRemove: () => void };

// 왼쪽 저장, 오른쪽 끝 빨간 삭제. 삭제는 저장된 단어에서만 눌리고, 잘못 눌러 지워지지 않게 한 번 더 누르게 한다
function Actions({ saved, canSave, onSave, onRemove }: ActionsProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={styles.actions}>
      {saved
        ? <Button disabled>저장됨</Button>
        : <Button variant="primary" onClick={onSave} disabled={!canSave}>단어장에 저장</Button>}
      <button type="button" className={styles.delete} disabled={!saved}
        onClick={() => (confirming ? onRemove() : setConfirming(true))}>
        {confirming ? '한 번 더 눌러 삭제' : '삭제'}
      </button>
    </div>
  );
}
