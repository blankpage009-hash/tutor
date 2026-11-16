import { HashRouter, Route, Routes } from 'react-router-dom';
import { PracticeLayout } from './layouts/PracticeLayout';
import { TabLayout } from './layouts/TabLayout';
import { CourseDetailScreen } from './screens/CourseDetailScreen';
import { CoursesScreen } from './screens/CoursesScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LessonScreen } from './screens/LessonScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { MoreScreen } from './screens/MoreScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { PromptScreen } from './screens/PromptScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { RoleplayScreen } from './screens/RoleplayScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ShadowingScreen } from './screens/ShadowingScreen';
import { VariationScreen } from './screens/VariationScreen';
import { VocabQuizScreen } from './screens/VocabQuizScreen';
import { VocabScreen } from './screens/VocabScreen';

// HashRouter(주소에 #이 붙는 방식): GitHub Pages는 서버 설정을 못 바꿔서,
// 일반 주소 방식이면 새로고침할 때 404가 난다.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/courses" element={<CoursesScreen />} />
          <Route path="/courses/:courseId" element={<CourseDetailScreen />} />
          <Route path="/library" element={<LibraryScreen />} />
          <Route path="/vocab" element={<VocabScreen />} />
          <Route path="/more" element={<MoreScreen />} />
          <Route path="/more/progress" element={<ProgressScreen />} />
          <Route path="/more/prompt" element={<PromptScreen />} />
          <Route path="/more/settings" element={<SettingsScreen />} />
        </Route>
        <Route element={<PracticeLayout />}>
          <Route path="/lesson/:lessonId" element={<LessonScreen />} />
          {/* key가 다르면 단계가 바뀔 때 화면이 새로 만들어져 이전 단계의 통과 기록이 남지 않는다 */}
          <Route path="/shadowing/:lessonId" element={<ShadowingScreen key="shadowing" />} />
          <Route path="/variation/:lessonId" element={<VariationScreen key="variation" />} />
          <Route path="/lesson-review/:lessonId" element={<ShadowingScreen key="review" kind="review" />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/vocab/quiz" element={<VocabQuizScreen />} />
          <Route path="/roleplay" element={<RoleplayScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
