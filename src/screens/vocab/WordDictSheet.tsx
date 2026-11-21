import { useEffect, useState } from 'react';
import { exactAudio, loadDictionary, lookupEntry } from '../../content/dictionary';
import { IconClose } from '../../components/icons/icons';
import { DictEntryView, type DictInfo } from '../../components/wordPicker/DictEntryView';
import { useSheetDrag } from '../../components/wordPicker/WordSheet';
import styles from '../../components/wordPicker/WordSheet.module.css';

type Props = { word: string; onClose: () => void };

// 단어장에서 카드를 누르면 뜨는 사전 창 (2026-11-21 사용자 요청: 저장 창의 발음·뜻·예문·표현 부분과 네이버 바로가기만).
// 문장 칸·"이 문장에서" 칸은 빼야 해서 contextIndex·phrase를 비워 넘긴다 (DictEntryView는 둘 다 없으면 그 칸을 안 그린다)
export function WordDictSheet({ word, onClose }: Props) {
  const [info, setInfo] = useState<DictInfo | null>(null);
  const [error, setError] = useState('');
  const drag = useSheetDrag(onClose);

  useEffect(() => {
    let alive = true;
    loadDictionary().then(
      (dict) => alive && setInfo({ hit: lookupEntry(dict, word), contextIndex: null, phrase: null, audio: exactAudio(dict, word) }),
      (e) => alive && setError(`사전을 못 읽었어요: ${String(e)}`),
    );
    return () => { alive = false; };
  }, [word]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section className={styles.sheet} style={drag.style} role="dialog" aria-modal="true" aria-label="단어 사전"
        onClick={(e) => e.stopPropagation()}>
        <div className={styles.top} {...drag.handlers}>
          <span className={styles.grab} aria-hidden="true" />
          <div className={styles.titleRow}>
            <p className={styles.word} lang="en">{word}</p>
            <button type="button" className={styles.close} onClick={onClose} aria-label="닫기"><IconClose /></button>
          </div>
        </div>
        {!info && !error && <p className={styles.hint} lang="ko">불러오는 중…</p>}
        {info && !info.hit && <p className={styles.hint} lang="ko">앱 사전에 없는 단어예요. 네이버 사전에서 볼 수 있어요.</p>}
        {info && <DictEntryView word={word} info={info} />}
        {error && <p className={styles.error} lang="ko">{error}</p>}
      </section>
    </div>
  );
}
