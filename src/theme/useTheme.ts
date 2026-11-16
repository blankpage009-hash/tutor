import { useCallback, useState } from 'react';
import { applyTheme, loadTheme, saveTheme, type ThemeSetting } from './theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeSetting>(loadTheme);
  const setTheme = useCallback((next: ThemeSetting) => {
    applyTheme(next);
    saveTheme(next);
    setThemeState(next);
  }, []);
  return { theme, setTheme };
}
