import { useSearchParams } from 'react-router-dom';
import type { Curriculum } from '../../content/lessonTypes';
import type { ProgressMap } from '../../lessonFlow';
import { currentLevel, locateLevel, summarizeCurriculum, summarizeUnit } from '../../levelProgress';
import { useSettings } from '../../settings/SettingsProvider';
import courseStyles from '../courses/Courses.module.css';
import { CoursePicker } from './CoursePicker';
import styles from './CurriculumSection.module.css';
import { UnitRow } from './UnitRow';
import { useCurriculumData } from './useCurriculumData';

// 코스 탭 본문: 과정 칩 → 레벨 번호 → 유닛 줄(펼치면 레슨). 고른 레벨·유닛은 주소(?level=&unit=)에 둔다.
// 레슨에서 닫기(X)나 뒤로가기로 돌아와도 보던 자리가 그대로 열리게 하려는 것이다
export function CurriculumSection() {
  const { data, progress, error } = useCurriculumData();
  if (error) return <p className={courseStyles.meta} lang="ko">{error}</p>;
  if (!data || !progress) return <p className={courseStyles.meta} lang="ko">불러오는 중…</p>;
  return <Browser data={data} progress={progress} />;
}

function Browser({ data, progress }: { data: Curriculum; progress: ProgressMap }) {
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();

  // 주소에 레벨이 없거나 틀리면 "내 레벨"을 미리 고른다
  const mine = currentLevel(summarizeCurriculum(data, progress).levels, settings.startLevel)?.key ?? null;
  const loc = locateLevel(data, params.get('level')) ?? locateLevel(data, mine) ?? { courseIdx: 0, levelIdx: 0 };
  const course = data.courses[loc.courseIdx];
  const level = course.levels[loc.levelIdx];
  const openUnit = Number(params.get('unit')) || null;

  // 눌러서 바꾼 것은 뒤로가기 목록에 쌓지 않는다 (탭을 누를 때마다 뒤로가기가 늘어나지 않게)
  const select = (levelKey: string, unit?: number) =>
    setParams(unit ? { level: levelKey, unit: String(unit) } : { level: levelKey }, { replace: true });

  const firstOpenUnit = level.units.find((u) => {
    const s = summarizeUnit(u, progress);
    return s.ready > 0 && s.done < s.ready;
  });
  return (
    <>
      <CoursePicker courseNames={data.courses.map((c) => c.name)} courseIdx={loc.courseIdx}
        levelCount={course.levels.length} levelIdx={loc.levelIdx}
        onCourse={(i) => select(data.courses[i].levels[0].key)}
        onLevel={(i) => select(course.levels[i].key)} />
      <p className={styles.levelName} lang="ko">{level.name}</p>
      <ul className={styles.units}>
        {level.units.map((u) => (
          <UnitRow key={u.no} unit={u} progress={progress} open={openUnit === u.no}
            current={firstOpenUnit?.no === u.no}
            onToggle={() => select(level.key, openUnit === u.no ? undefined : u.no)} />
        ))}
      </ul>
    </>
  );
}
