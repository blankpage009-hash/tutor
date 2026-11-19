import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getAppSettingsRaw, saveAppSettingsRaw } from '../db/settings';
import { DEFAULT_SETTINGS, type AppSettings } from '../db/types';
import { setBaseRate } from '../speech/audioPlayer';
import { normalizeSettings } from './settings';

type Ctx = {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  saveError: boolean;
};

const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, update: () => undefined, saveError: false });

// 설정을 한 번 읽어 둔 뒤에야 화면을 그린다(수 밀리초). 화면이 뜬 다음에 값이 바뀌면
// useState(초기값)으로 설정을 받는 화면(자동 넘기기 스위치 등)이 옛 값에 머물기 때문이다.
// 읽기가 실패해도 기본값으로 앱은 계속 쓸 수 있어야 한다
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    getAppSettingsRaw().then(normalizeSettings, () => DEFAULT_SETTINGS).then((s) => {
      setBaseRate(s.speechRate);
      setSettings(s);
    });
  }, []);

  // 저장 같은 부수 작용을 setState 안에 넣으면 개발 모드에서 두 번 실행되므로, 최신 값은 ref로 들고 있는다
  const latest = useRef<AppSettings | null>(null);
  latest.current = settings;
  const update = useCallback((patch: Partial<AppSettings>) => {
    const next = normalizeSettings({ ...latest.current, ...patch });
    latest.current = next;
    setSettings(next);
    setBaseRate(next.speechRate);
    saveAppSettingsRaw(next).then(() => setSaveError(false), () => setSaveError(true));
  }, []);

  const value = useMemo(() => ({ settings: settings ?? DEFAULT_SETTINGS, update, saveError }), [settings, update, saveError]);
  if (!settings) return null;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  return useContext(SettingsContext);
}
