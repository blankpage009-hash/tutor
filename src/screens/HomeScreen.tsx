import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { TwoColumn } from '../components/TwoColumn';
import { loadCurriculum } from '../content/curriculumLoader';
import { loadCourse, loadManifest } from '../content/loader';
import { findResume, STAGE_LABEL, stagePath, type ProgressMap } from '../lessonFlow';
import { findNewResume, NEW_STAGE_LABEL, newStagePath } from '../newLessonFlow';
import { useSettings } from '../settings/SettingsProvider';
import courseStyles from './courses/Courses.module.css';
import { TodayCard } from './home/TodayCard';
import { useProgressMap } from './courses/useProgressMap';
import { useDueCount } from './review/useDueCount';
import { useDueWordCount } from './vocab/useVocab';
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

// 오늘 복습: 때가 된 저장 문장 개수와 단어 개수
function ReviewCard() {
  const due = useDueCount();
  return (
    <>
      <h2 className={styles.sub}>오늘 복습</h2>
      {due === null && <p className={styles.note} lang="ko">세는 중…</p>}
      {due === 0 && <p className={styles.note} lang="ko">오늘 복습할 문장이 없어요.</p>}
      {due !== null && due > 0 && (
        <Link to="/review" className={courseStyles.row}>
          <span className={courseStyles.name} lang="ko">오늘 복습할 문장 {due}개</span>
          <p className={courseStyles.meta} lang="ko">한국어를 보고 영어로 말해요 · 탭해서 시작</p>
        </Link>
      )}
      <WordDueRow />
    </>
  );
}

// 오늘 복습할 단어 수 → 단어 퀴즈(종류 고르기)로
function WordDueRow() {
  const due = useDueWordCount();
  if (due === null) return null;
  if (due === 0) return <p className={styles.note} lang="ko">오늘 복습할 단어가 없어요.</p>;
  return (
    <Link to="/vocab/quiz?scope=due" className={courseStyles.row}>
      <span className={courseStyles.name} lang="ko">오늘 복습할 단어 {due}개</span>
      <p className={courseStyles.meta} lang="ko">카드·쓰기·말하기 퀴즈 · 탭해서 시작</p>
    </Link>
  );
}

export function HomeScreen() {
  const progress = useProgressMap();
  const fresh = useNewResume(progress);
  const old = useOldResume(progress);
  const loading = fresh === undefined || old === undefined;
  const { tutorName } = useSettings().settings;
  // "David와"처럼 이름 뒤 조사(와/과)는 받침에 따라 달라져서 쓰지 않고 "튜터 이름" 형태로 둔다
  return (
    <>
      <ScreenHeader eyebrow={`오늘 · 튜터 ${tutorName}`} title="오늘의 연습" />
      <TodayCard />
      <TwoColumn list={<ReviewCard />}>
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
