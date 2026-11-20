import { SettingsRow } from '../../components/SettingsRow';
import { Switch } from '../../components/Switch';

type Props = { name: string; on: boolean; onChange: (on: boolean) => void };

export function SwitchRow({ name, on, onChange }: Props) {
  return (
    <SettingsRow name={name}>
      <Switch label={name} on={on} onChange={onChange} />
    </SettingsRow>
  );
}
