import { ScreenHeader } from '../components/ScreenHeader';
import { CurriculumSection } from './curriculum/CurriculumSection';
import { useProgressMap } from './courses/useProgressMap';

// 코스 간 잠금 없음(PLAN 5.1). 새 커리큘럼의 과정·레벨 목록만 보여 준다 (옛 10코스는 삭제됨)
export function CoursesScreen() {
  const progress = useProgressMap();
  return (
    <>
      <ScreenHeader eyebrow="코스" title="코스" />
      <CurriculumSection progress={progress} />
    </>
  );
}
