import { BackLink } from '../components/BackLink';
import { ScreenHeader } from '../components/ScreenHeader';
import { GeminiKeyRow } from './settings/GeminiKeyRow';

export function GeminiKeyScreen() {
  return (
    <>
      <BackLink to="/settings" label="Settings" />
      <ScreenHeader eyebrow="DATA" title="Gemini Key" />
      <GeminiKeyRow />
    </>
  );
}
