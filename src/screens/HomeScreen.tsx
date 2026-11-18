import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { TwoColumn } from '../components/TwoColumn';
import { loadCurriculum } from '../content/curriculumLoader';
import { loadCourse, loadManifest } from '../content/loader';
import { findResume, STAGE_LABEL, stagePath, type ProgressMap } from '../lessonFlow';
import { findNewResume, NEW_STAGE_LABEL, newStagePath } from '../newLessonFlow';
import courseStyles from './courses/Courses.module.css';
import { useProgressMap } from './courses/useProgressMap';
import styles from './HomeScreen.module.css';

type Resume = { to: string; title: string; where: string };

// 새 커리큘럼: 하던 레슨, 없으면 아직 안 끝낸 다음 레슨 (사용자 결정 2026-11-18: 홈 맨 위)
function useNewResume(progress: ProgressMap): Resume | null | undefined {
  const [resume, setResume] = useState<Resume | null | undefined>(undefined);
  useEffect(() => {
    loadCurriculum()
      .then((c) => {
        const r = findNewResume(c, progress);
        const started = r ? progress.has(r.id) : false;
        setResume(r ? { to: newStagePath(r.id, r.stage), title: r.title, where: `${r.level} · ${started ? `${NEW_STAGE_LABEL[r.stage]} 중` : '새 레슨'}` } : null);
      })
      .catch(() => setResume(null));
  }, [progress]);
  return resume;
}

// 기존 10코스: 전환 기간이라 하다 만 수업이 있을 때만 보여 준다 (사용자 결정 2026-11-18)
function useOldResume(progress: ProgressMap): Resume | null | undefined {
  const [resume, setResume] = useState<Resume | null | undefined>(undefined);
  useEffect(() => {
    loadManifest()
      .then((m) => Promise.all([...m.courses].sort((a, b) => a.order - b.order).map((c) => loadCourse(c.id))))
      .then((courses) => {
        const lessons = courses.flatMap((c) => c.lessons.map((l) => ({ id: l.id, titleKo: l.titleKo, course: c.titleKo })));
        const r = findResume(lessons, progress);
        const lesson = r && progress.has(r.id) ? lessons.find((l) => l.id === r.id) : undefined;
        setResume(r && lesson ? { to: stagePath(r.id, r.stage), title: lesson.titleKo, where: `${lesson.course} · ${STAGE_LABEL[r.stage]}` } : null);
      })
      .catch(() => setResume(null));
  }, [progress]);
  return resume;
}

function ResumeRow({ r }: { r: Resume }) {
  return (
    <Link to={r.to} className={courseStyles.row}>
      <span className={courseStyles.name} lang="ko">{r.title}</span>
      <p className={courseStyles.meta} lang="ko">{r.where}</p>
    </Link>
  );
}

export function HomeScreen() {
  const progress = useProgressMap();
  const fresh = useNewResume(progress);
  const old = useOldResume(progress);
  const loading = fresh === undefined || old === undefined;
  return (
    <>
      <ScreenHeader eyebrow="오늘" title="오늘의 연습" />
      <TwoColumn list={<p className={styles.note} lang="ko">오늘 복습할 문장·단어는 다음 작업(복습·단어장)에서 채웁니다.</p>}>
        <h2 className={styles.sub}>이어서 할 수업</h2>
        {loading && <p className={styles.note} lang="ko">불러오는 중…</p>}
        {!loading && !fresh && !old && <p className={styles.note} lang="ko">모든 수업을 마쳤어요!</p>}
        {!loading && fresh && <ResumeRow r={fresh} />}
        {!loading && old && <ResumeRow r={old} />}
        <p className={styles.note} lang="ko">
          <Link to="/courses">코스 전체 보기</Link>
        </p>
      </TwoColumn>
    </>
  );
}
