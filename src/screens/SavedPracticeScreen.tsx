import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Lesson } from '../content/types';
import { fillMissing, loadRows } from './library/useLibrary';
import { toSavedLesson } from './library/savedLesson';
import { ShadowingScreen } from './ShadowingScreen';
import styles from './library/Library.module.css';

// 보관함에서 "다시 쉐도잉": 저장한 문장들을 수업 한 개처럼 묶어 기존 쉐도잉 화면에 태운다.
// :startId가 문장 id면 그 문장부터, 'all'이면 처음부터
export function SavedPracticeScreen() {
  const { startId = 'all' } = useParams();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadRows()
      .then(fillMissing)
      .then((rows) => alive && setLesson(toSavedLesson(rows, startId)))
      .catch((e) => alive && setError(`보관함을 못 읽었어요: ${String(e)}`));
    return () => { alive = false; };
  }, [startId]);

  if (error) return <p className={styles.note} lang="ko">{error}</p>;
  if (lesson === undefined) return <p className={styles.note} lang="ko">불러오는 중…</p>;
  if (lesson === null) return <p className={styles.note} lang="ko">연습할 문장이 없어요. 보관함에서 문장을 확인해 주세요.</p>;
  // key: 시작 문장이 바뀌면 통과 기록·위치도 새로 시작하게 (같은 이름의 묶음으로 보이기 때문)
  return <ShadowingScreen key={startId} fixedLesson={lesson} />;
}
