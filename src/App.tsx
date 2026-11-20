import { HashRouter, Route, Routes } from 'react-router-dom';
import { WordPickerProvider } from './components/wordPicker/WordPicker';
import { PlainLayout } from './layouts/PlainLayout';
import { PracticeLayout } from './layouts/PracticeLayout';
import { TabLayout } from './layouts/TabLayout';
import { CoursesScreen } from './screens/CoursesScreen';
import { LevelRedirect } from './screens/curriculum/LevelRedirect';
import { CustomRolePlayScreen } from './screens/CustomRolePlayScreen';
import { DialogueScreen } from './screens/DialogueScreen';
import { DrillScreen } from './screens/DrillScreen';
import { GeminiKeyScreen } from './screens/GeminiKeyScreen';
import { LearnScreen } from './screens/LearnScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { SavedPracticeScreen } from './screens/SavedPracticeScreen';
import { NewLessonMenuScreen } from './screens/NewLessonMenuScreen';
import { NewRolePlayScreen } from './screens/NewRolePlayScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { PromptScreen } from './screens/PromptScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { RoleplayScreen } from './screens/RoleplayScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StartLevelScreen } from './screens/StartLevelScreen';
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
          <Route path="/curriculum/:levelKey" element={<LevelRedirect />} />
          <Route path="/library" element={<LibraryScreen />} />
          <Route path="/library/practice/:startId" element={<SavedPracticeScreen />} />
          <Route path="/vocab" element={<VocabScreen />} />
          <Route path="/prompt" element={<PromptScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/settings/progress" element={<ProgressScreen />} />
          <Route path="/settings/start-level" element={<StartLevelScreen />} />
          <Route path="/settings/gemini-key" element={<GeminiKeyScreen />} />
        </Route>
        <Route element={<PlainLayout />}>
          <Route path="/n/:lessonId" element={<NewLessonMenuScreen />} />
          {/* 설명·대화문은 위쪽 단계 막대에 X를 직접 그린다 (X → 레슨 화면, Phase 7.95 5단계) */}
          <Route path="/n/:lessonId/learn" element={<LearnScreen />} />
          <Route path="/n/:lessonId/dialogue" element={<DialogueScreen />} />
        </Route>
        <Route element={<PracticeLayout />}>
          {/* 새 커리큘럼 레슨 (Phase 5.5) */}
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
