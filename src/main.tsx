import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { startStudyClock } from './studyClock';
import { applyTheme, loadTheme } from './theme/theme';
import './styles/tokens.css';
import './styles/global.css';

// 첫 화면이 그려지기 전에 테마를 적용해야 다크 모드 사용자가 흰 화면 번쩍임을 보지 않는다
applyTheme(loadTheme());
registerSW({ immediate: true });
startStudyClock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
