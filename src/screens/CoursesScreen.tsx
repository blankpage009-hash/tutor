import { ScreenHeader } from '../components/ScreenHeader';
import { CurriculumSection } from './curriculum/CurriculumSection';

// 코스 간 잠금 없음(PLAN 5.1). 새 커리큘럼의 과정·레벨·유닛만 보여 준다 (옛 10코스는 삭제됨)
export function CoursesScreen() {
  return (
    <>
      <ScreenHeader eyebrow="Curriculum" title="Courses" />
      <CurriculumSection />
    </>
  );
}
