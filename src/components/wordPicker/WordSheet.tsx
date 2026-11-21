import { useEffect, useState } from 'react';
import { loadGlossary, lookupWord } from '../../content/glossary';
import { findWord, saveWord } from '../../db/vocab';
import type { VocabWord } from '../../db/types';
import { POS_OPTIONS, posLabel } from '../../posLabels';
import { normalizeWord } from '../../wordTap';
import { Button } from '../Button';
import type { WordSource } from './WordPicker';
import styles from './WordSheet.module.css';

type Props = { word: string; source: WordSource; onClose: () => void };

type Loaded = { saved: VocabWord | null; fromGlossary: boolean };

// 단어를 눌렀을 때 아래에서 올라오는 저장 창: 사전이 있으면 뜻·품사를 미리 채우고, 사용자가 고쳐서 저장한다.
// 저장 취소는 단어장 화면에서만 한다(사용자 결정 2026-11-21)
export function WordSheet({ word, source, onClose }: Props) {
  const key = normalizeWord(word);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [meaning, setMeaning] = useState('');
  const [pos, setPos] = useState('noun');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([loadGlossary(), findWord(key)]).then(([glossary, saved]) => {
      if (!alive) return;
      const hit = saved ? null : lookupWord(glossary, key);
      setMeaning(hit?.ko ?? '');
      setPos(hit?.pos ?? 'noun');
      setLoaded({ saved: saved ?? null, fromGlossary: Boolean(hit) });
    }).catch((e) => alive && setError(`단어장을 못 읽었어요: ${String(e)}`));
    return () => { alive = false; };
  }, [key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setError('');
    try {
      const row = await saveWord({ word: key, meaning: meaning.trim(), pos, sourceSentenceId: source.id, sourceEn: source.en, sourceKo: source.ko });
      if (!row) throw new Error('저장이 확인되지 않았어요');
      // 저장되면 문장 속 단어에 밑줄이 생기는 것으로 알 수 있으니 창은 바로 닫는다
      onClose();
    } catch (e) {
      setError(`저장하지 못했어요: ${String(e)}`);
    }
  };

  const saved = loaded?.saved;
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label="단어 저장" onClick={(e) => e.stopPropagation()}>
        <p className={styles.word} lang="en">{key}</p>
        <div className={styles.source}>
          <p className={styles.sourceEn} lang="en">{source.en}</p>
          {source.ko && <p className={styles.sourceKo} lang="ko">{source.ko}</p>}
        </div>
        {!loaded && !error && <p className={styles.hint} lang="ko">불러오는 중…</p>}
        {saved && (
          <>
            <p className={styles.saved} lang="ko"><b>{posLabel(saved.pos)}</b> · {saved.meaning}</p>
            <p className={styles.hint} lang="ko">이미 단어장에 있어요. 고치거나 빼기는 단어장 화면에서 할 수 있어요.</p>
          </>
        )}
        {loaded && !saved && (
          <EditView meaning={meaning} pos={pos} fromGlossary={loaded.fromGlossary} onMeaning={setMeaning} onPos={setPos} onSave={save} />
        )}
        {error && <p className={styles.error} lang="ko">{error}</p>}
        <div className={styles.actions}>
          <Button onClick={onClose}>닫기</Button>
        </div>
      </section>
    </div>
  );
}

type EditProps = {
  meaning: string; pos: string; fromGlossary: boolean;
  onMeaning: (v: string) => void; onPos: (v: string) => void; onSave: () => void;
};

function EditView({ meaning, pos, fromGlossary, onMeaning, onPos, onSave }: EditProps) {
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
      <div className={styles.actions}>
        <Button variant="primary" onClick={onSave} disabled={!meaning.trim()}>단어장에 저장</Button>
      </div>
    </>
  );
}
