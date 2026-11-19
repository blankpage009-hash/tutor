import { HashRouter, Route, Routes } from 'react-router-dom';
import { WordPickerProvider } from './components/wordPicker/WordPicker';
import { PracticeLayout } from './layouts/PracticeLayout';
import { TabLayout } from './layouts/TabLayout';
import { CoursesScreen } from './screens/CoursesScreen';
import { CurriculumLevelScreen } from './screens/CurriculumLevelScreen';
import { CustomRolePlayScreen } from './screens/CustomRolePlayScreen';
import { DialogueScreen } from './screens/DialogueScreen';
import { DrillScreen } from './screens/DrillScreen';
import { LearnScreen } from './screens/LearnScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { SavedPracticeScreen } from './screens/SavedPracticeScreen';
import { MoreScreen } from './screens/MoreScreen';
import { NewLessonMenuScreen } from './screens/NewLessonMenuScreen';
import { NewRolePlayScreen } from './screens/NewRolePlayScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { PromptScreen } from './screens/PromptScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { RoleplayScreen } from './screens/RoleplayScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SettingsProvider } from './settings/SettingsProvider';
import { VocabQuizScreen } from './screens/VocabQuizScreen';
import { VocabScreen } from './screens/VocabScreen';

// HashRouter(주소에 #이 붙는 방식): GitHub Pages는 서버 설정을 못 바꿔서,
// 일반 주소 방식이면 새로고침할 때 404가 난다.
export function App() {
  return (
    <HashRouter>
      <SettingsProvider>
      <WordPickerProvider>
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/courses" element={<CoursesScreen />} />
          <Route path="/curriculum/:levelKey" element={<CurriculumLevelScreen />} />
          <Route path="/library" element={<LibraryScreen />} />
          <Route path="/library/practice/:startId" element={<SavedPracticeScreen />} />
          <Route path="/vocab" element={<VocabScreen />} />
          <Route path="/more" element={<MoreScreen />} />
          <Route path="/more/progress" element={<ProgressScreen />} />
          <Route path="/more/prompt" element={<PromptScreen />} />
          <Route path="/more/settings" element={<SettingsScreen />} />
        </Route>
        <Route element={<PracticeLayout />}>
          {/* 새 커리큘럼 레슨 (Phase 5.5) */}
          <Route path="/n/:lessonId" element={<NewLessonMenuScreen />} />
          <Route path="/n/:lessonId/learn" element={<LearnScreen />} />
          <Route path="/n/:lessonId/dialogue" element={<DialogueScreen />} />
          <Route path="/n/:lessonId/drill" element={<DrillScreen />} />
          <Route path="/n/:lessonId/roleplay" element={<NewRolePlayScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/vocab/quiz" element={<VocabQuizScreen />} />
          <Route path="/roleplay" element={<RoleplayScreen />} />
          <Route path="/roleplay/custom" element={<CustomRolePlayScreen />} />
        </Route>
      </Routes>
      </WordPickerProvider>
      </SettingsProvider>
    </HashRouter>
  );
}
