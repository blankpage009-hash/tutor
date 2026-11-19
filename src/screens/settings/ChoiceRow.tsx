import { SegmentedControl } from '../../components/SegmentedControl';
import { SettingsRow } from '../../components/SettingsRow';

type Choice<T> = { value: T; label: string };

type Props<T extends string | number | boolean> = {
  name: string;
  hint?: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
};

// SegmentedControl은 글자 값만 받아서, 숫자·참거짓 설정도 쓰도록 글자로 바꿔 넘기고 돌려받을 때 되돌린다
export function ChoiceRow<T extends string | number | boolean>({ name, hint, choices, value, onChange }: Props<T>) {
  const options = choices.map((c) => ({ value: String(c.value), label: c.label }));
  const handle = (v: string) => {
    const found = choices.find((c) => String(c.value) === v);
    if (found) onChange(found.value);
  };
  return (
    <>
      <SettingsRow name={name} hint={hint} />
      <div style={{ padding: 'var(--space-3) 0' }}>
        <SegmentedControl label={name} options={options} value={String(value)} onChange={handle} />
      </div>
    </>
  );
}
