import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import styles from './library/Library.module.css';
import { useVocab } from './vocab/useVocab';
import { VocabExportBar } from './vocab/VocabExportBar';
import { VocabRow } from './vocab/VocabRow';

// 단어장: 수업·보관함·쉐도잉에서 문장 속 단어를 눌러 저장한 단어 목록
export function VocabScreen() {
  const { words, error, remove, edit } = useVocab();
  const nav = useNavigate();
  return (
    <>
      <ScreenHeader eyebrow="단어장" title="저장한 단어" />
      {error && <p className={styles.note} lang="ko">{error}</p>}
      {!words && !error && <p className={styles.note} lang="ko">불러오는 중…</p>}
      {words?.length === 0 && (
        <p className={styles.note} lang="ko">아직 저장한 단어가 없어요. 수업의 핵심 문장·대화문·보관함·쉐도잉에서 문장 속 단어를 누르면 여기에 모여요.</p>
      )}
      {words && words.length > 0 && (
        <>
          <p className={styles.note} lang="ko">{words.length}개 · 최근에 저장한 단어가 위에 있어요</p>
          <div className={styles.actions}>
            <Button variant="primary" onClick={() => nav('/vocab/quiz?scope=due')}>단어 퀴즈</Button>
            <Button onClick={() => nav('/vocab/quiz?scope=random')}>랜덤 퀴즈</Button>
          </div>
          <ul className={styles.list}>
            {words.map((w) => <VocabRow key={w.id} word={w} onRemove={remove} onEdit={edit} />)}
          </ul>
          <VocabExportBar rows={words} />
        </>
      )}
    </>
  );
}
