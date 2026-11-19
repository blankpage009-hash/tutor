import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadCurriculum } from '../content/curriculumLoader';
import courseStyles from './courses/Courses.module.css';
import { useProgressMap } from './courses/useProgressMap';
import { doneLessonGroups, type DoneGroup } from './roleplay/doneLessons';
import { NewSituationBox } from './roleplay/NewSituationBox';

// 끝낸 레슨의 롤플레이를 골라 다시 연습하는 목록. 연습 화면은 레슨 STEP 4(/n/:id/roleplay)를 그대로 쓴다
export function RoleplayScreen() {
  const progress = useProgressMap();
  const [groups, setGroups] = useState<DoneGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadCurriculum().then((c) => setGroups(doneLessonGroups(c, progress)),
      (e: Error) => setError(e.message));
  }, [progress]);
  return (
    <>
      <BackLink to="/" label="오늘" />
      <ScreenHeader eyebrow="오늘" title="롤플레잉" />
      <p className={courseStyles.intro} lang="ko">
        끝낸 레슨의 롤플레이를 다시 해 볼 수 있어요. 상대가 먼저 말하고, 내 차례에 배운 문장으로 대답해요.
      </p>
      <NewSituationBox />
      {error && <p className={courseStyles.meta} lang="ko">{error}</p>}
      {!error && !groups && <p className={courseStyles.meta} lang="ko">불러오는 중…</p>}
      {groups && groups.length === 0 && (
        <p className={courseStyles.meta} lang="ko">아직 끝낸 레슨이 없어요. 레슨의 네 단계를 모두 끝내면 여기에 나타나요.</p>
      )}
      {groups?.map((g) => <GroupList key={g.levelKey} group={g} />)}
    </>
  );
}

function GroupList({ group }: { group: DoneGroup }) {
  return (
    <section>
      <h2 className={courseStyles.name} lang="ko" style={{ margin: 'var(--space-5) 0 0' }}>{group.levelName}</h2>
      <ul className={courseStyles.list}>
        {group.lessons.map((l) => (
          <li key={l.id}>
            <Link to={`/n/${l.id}/roleplay`} className={courseStyles.row}>
              <span className={courseStyles.name} lang="ko">{l.title}</span>
              <p className={courseStyles.meta} lang="ko">{l.unit}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
