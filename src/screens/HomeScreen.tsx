import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { TwoColumn } from '../components/TwoColumn';
import { loadCourse, loadManifest } from '../content/loader';
import { findResume, STAGE_LABEL, stagePath } from '../lessonFlow';
import courseStyles from './courses/Courses.module.css';
import { useProgressMap } from './courses/useProgressMap';
import styles from './HomeScreen.module.css';

type Resume = { to: string; title: string; where: string };

// 이어서 할 수업 1개. 오늘 복습 큐·스트릭 같은 나머지 홈 요약은 Phase 5 2세션·Phase 7에서 채운다
function useResume(): Resume | null | undefined {
  const progress = useProgressMap();
  const [resume, setResume] = useState<Resume | null | undefined>(undefined);
  useEffect(() => {
    loadManifest()
      .then((m) => Promise.all([...m.courses].sort((a, b) => a.order - b.order).map((c) => loadCourse(c.id))))
      .then((courses) => {
        const lessons = courses.flatMap((c) => c.lessons.map((l) => ({ id: l.id, titleKo: l.titleKo, course: c.titleKo })));
        const r = findResume(lessons, progress);
        const lesson = r && lessons.find((l) => l.id === r.id);
        setResume(r && lesson ? { to: stagePath(r.id, r.stage), title: lesson.titleKo, where: `${lesson.course} · ${STAGE_LABEL[r.stage]}` } : null);
      })
      .catch(() => setResume(null));
  }, [progress]);
  return resume;
}

export function HomeScreen() {
  const resume = useResume();
  return (
    <>
      <ScreenHeader eyebrow="오늘" title="오늘의 연습" />
      <TwoColumn list={<p className={styles.note} lang="ko">오늘 복습할 문장·단어는 다음 작업(복습·단어장)에서 채웁니다.</p>}>
        <h2 className={styles.sub}>이어서 할 수업</h2>
        {resume === undefined && <p className={styles.note} lang="ko">불러오는 중…</p>}
        {resume === null && <p className={styles.note} lang="ko">모든 수업을 마쳤어요!</p>}
        {resume && (
          <Link to={resume.to} className={courseStyles.row}>
            <span className={courseStyles.name} lang="ko">{resume.title}</span>
            <p className={courseStyles.meta} lang="ko">{resume.where}</p>
          </Link>
        )}
        <p className={styles.note} lang="ko">
          <Link to="/courses">코스 전체 보기</Link>
        </p>
      </TwoColumn>
    </>
  );
}
