export type ThemeSetting = 'system' | 'light' | 'dark';

const KEY = 'tutor.theme';

export function loadTheme(): ThemeSetting {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // 사생활 보호 모드 등에서 저장소 접근이 막혀도 앱은 시스템 테마로 계속 동작해야 한다
  }
  return 'system';
}

// "시스템"은 data-theme을 아예 떼어야 tokens.css의 prefers-color-scheme 규칙이 작동한다
export function applyTheme(theme: ThemeSetting): void {
  const el = document.documentElement;
  if (theme === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', theme);
}

export function saveTheme(theme: ThemeSetting): void {
  try {
    if (theme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // 위와 같은 이유로 저장 실패는 무시
  }
}
