import { SegmentedControl } from '../../components/SegmentedControl';
import { SettingsRow } from '../../components/SettingsRow';
import styles from './Settings.module.css';

type Choice<T> = { value: T; label: string };

type Props<T extends string | number> = {
  name: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
};

// SegmentedControl은 글자 값만 받아서, 숫자 설정도 쓰도록 글자로 바꿔 넘기고 돌려받을 때 되돌린다
export function ChoiceRow<T extends string | number>({ name, choices, value, onChange }: Props<T>) {
  const options = choices.map((c) => ({ value: String(c.value), label: c.label }));
  const handle = (v: string) => {
    const found = choices.find((c) => String(c.value) === v);
    if (found) onChange(found.value);
  };
  return (
    <SettingsRow name={name}>
      <div className={styles.choice}>
        <SegmentedControl compact label={name} options={options} value={String(value)} onChange={handle} />
      </div>
    </SettingsRow>
  );
}
